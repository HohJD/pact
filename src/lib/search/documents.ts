import "server-only";

import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import MiniSearch from "minisearch";

import { processTerm, SEARCH_OPTIONS } from "./catalogue";

export interface PolicyDocument {
  id: string;
  policy_id: string;
  label: string;
  url: string | null;
  kind: "URL" | "PDF" | "TEXT";
  text: string;
  created_at: string;
}

export interface DocumentHit {
  id: string;
  policy_id: string;
  label: string;
  url: string | null;
  snippet: string;
}

type IndexedPolicyDocument = PolicyDocument;

type DocumentGlobals = typeof globalThis & {
  __pactPolicyDocuments?: PolicyDocument[];
  __pactPolicyDocumentsIndex?: MiniSearch<IndexedPolicyDocument>;
};

const documentGlobals = globalThis as DocumentGlobals;

function memoryDocuments(): PolicyDocument[] {
  return (documentGlobals.__pactPolicyDocuments ??= []);
}

function memoryIndex(): MiniSearch<IndexedPolicyDocument> {
  if (documentGlobals.__pactPolicyDocumentsIndex)
    return documentGlobals.__pactPolicyDocumentsIndex;

  const index = new MiniSearch<IndexedPolicyDocument>({
    fields: ["label", "text"],
    storeFields: ["id", "policy_id", "label", "url", "kind", "created_at"],
    processTerm,
    searchOptions: SEARCH_OPTIONS,
  });
  index.addAll(memoryDocuments());
  documentGlobals.__pactPolicyDocumentsIndex = index;
  return index;
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service key not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function storeDocument(
  doc: Omit<PolicyDocument, "id" | "created_at">,
): Promise<void> {
  if (process.env.PACT_DATA_SOURCE === "supabase") {
    const { error } = await serviceClient().from("ingest_sources").insert({
      kind: doc.kind,
      label: doc.label,
      url: doc.url,
      raw_text: doc.text,
      policy_id: doc.policy_id,
    });
    if (error) throw new Error(`supabase ingest_sources: ${error.message}`);
    return;
  }

  const record: PolicyDocument = {
    ...doc,
    id: randomUUID(),
    created_at: new Date().toISOString(),
  };
  memoryIndex().add(record);
  memoryDocuments().push(record);
}

function createSnippet(text: string, terms: string[]): string {
  const plainText = text.replace(/\s+/g, " ").trim();
  if (plainText.length <= 240) return plainText;

  const lowerText = plainText.toLowerCase();
  const firstMatch = terms
    .map((term) => lowerText.indexOf(term.toLowerCase()))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  let start = Math.max(0, (firstMatch ?? 0) - 120);
  const end = Math.min(plainText.length, start + 240);
  if (end === plainText.length) start = Math.max(0, end - 240);

  return `${start > 0 ? "…" : ""}${plainText.slice(start, end).trim()}${
    end < plainText.length ? "…" : ""
  }`;
}

export async function searchDocuments(
  q: string,
  limit = 10,
): Promise<DocumentHit[]> {
  const query = q.trim();
  if (!query) return [];

  if (process.env.PACT_DATA_SOURCE === "supabase") {
    try {
      const { data, error } = await serviceClient().rpc("search_documents", {
        query,
        match_count: limit,
      });
      if (error) return [];
      return ((data ?? []) as Array<{
        id: string;
        policy_id: string;
        label: string;
        url: string | null;
        snippet: string | null;
      }>).map((row) => ({
        id: row.id,
        policy_id: row.policy_id,
        label: row.label,
        url: row.url,
        snippet: (row.snippet ?? "").replace(/\s+/g, " ").trim(),
      }));
    } catch {
      return [];
    }
  }

  const documents = memoryDocuments();
  const byId = new Map(documents.map((document) => [document.id, document]));
  return memoryIndex()
    .search(query, SEARCH_OPTIONS)
    .slice(0, Math.max(0, limit))
    .flatMap((hit) => {
      const document = byId.get(hit.id as string);
      if (!document) return [];
      return [
        {
          id: document.id,
          policy_id: document.policy_id,
          label: document.label,
          url: document.url,
          snippet: createSnippet(document.text, hit.terms),
        },
      ];
    });
}
