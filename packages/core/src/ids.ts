/**
 * Branded ID types.
 *
 * Every entity ID is a UUID string at runtime, which means the compiler would happily let
 * you pass an `agentId` where a `conversationId` is expected. Branding makes that a type
 * error. In a multi-tenant system this is worth the small ceremony — passing the wrong ID
 * across a tenant boundary is exactly the bug class we cannot afford.
 */

declare const brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [brand]: B };

export type OrganizationId = Brand<string, 'OrganizationId'>;
export type UserId = Brand<string, 'UserId'>;
export type AgentId = Brand<string, 'AgentId'>;
export type KnowledgeSourceId = Brand<string, 'KnowledgeSourceId'>;
export type KnowledgeDocumentId = Brand<string, 'KnowledgeDocumentId'>;
export type ConversationId = Brand<string, 'ConversationId'>;
export type MessageId = Brand<string, 'MessageId'>;
export type ApiKeyId = Brand<string, 'ApiKeyId'>;
export type SessionId = Brand<string, 'SessionId'>;

/**
 * Cast a validated string to a branded ID.
 *
 * Only call this at a trust boundary where the value has already been validated (a zod
 * parse, or a value read out of the database). It is an assertion, not a check.
 */
export const asId = <T extends string>(value: string): T => value as T;
