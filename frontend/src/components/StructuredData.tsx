/**
 * JSON-LD emitter.
 *
 * `<` is escaped before the payload reaches the DOM so a string in the data can
 * never close the script tag early — the one real hazard of writing JSON into
 * an inline script.
 */
export function StructuredData({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
