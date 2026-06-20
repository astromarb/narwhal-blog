type Props = {
  id: string;
  word1: string;
  word2: string;
};

function splitLeadWord(value: string) {
  const normalized = value.trim();
  const ampIndex = normalized.indexOf("&");
  if (ampIndex === -1) return { lead: normalized, joiner: "" };
  return {
    lead: normalized.slice(0, ampIndex).trim(),
    joiner: normalized.slice(ampIndex).trim(),
  };
}

export default function KineticHeroTitle({ id, word1, word2 }: Props) {
  const { lead, joiner } = splitLeadWord(word1);
  const label = `${word1} ${word2}`.replace(/\s+/g, " ").trim();

  return (
    <h1 id={id} className="kinetic-hero-title" aria-label={label}>
      <span className="kinetic-hero-title__word kinetic-hero-title__strata" data-text={lead}>
        {lead}
      </span>
      {joiner && (
        <span className="kinetic-hero-title__joiner" aria-hidden="true">
          {joiner}
        </span>
      )}
      <span className="kinetic-hero-title__word kinetic-hero-title__signals" data-text={word2}>
        <em>{word2}</em>
      </span>
    </h1>
  );
}
