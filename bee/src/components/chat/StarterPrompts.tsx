import './Starters.css';

export function StarterPrompts({
  prompts,
  onPick,
}: {
  prompts: string[];
  onPick: (text: string) => void;
}) {
  return (
    <div className="starters" data-testid="bee-starters">
      {prompts.map((prompt) => (
        <button key={prompt} className="starter" type="button" onClick={() => onPick(prompt)}>
          {prompt}
        </button>
      ))}
    </div>
  );
}
