import "./_group.css";

const stats = [
  { icon: "🌍", tone: "teal", text: "Level: 1" },
  { icon: "⭐", tone: "purple", text: "55/100" },
  { icon: "🌟", tone: "gold", text: "0 Reps" },
  { icon: "💲", tone: "coin", text: "35.3K" },
  { icon: "💗", tone: "pink", text: "live for yas" },
  { icon: "🌟", tone: "blue", text: "live for yas" },
];

const slots = ["MASCOTE", "PET EQUIPADO", "SLOT VAZIO"];

function SlotPattern() {
  return (
    <div aria-hidden="true" className="slot-pattern">
      {Array.from({ length: 8 }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function StatPill({
  icon,
  tone,
  text,
}: {
  icon: string;
  tone: string;
  text: string;
}) {
  return (
    <div className="stat-pill">
      <div className={`stat-icon ${tone}`} aria-hidden="true">
        {icon}
      </div>
      <strong>{text}</strong>
    </div>
  );
}

export function KosameProfile() {
  return (
    <main className="profile-stage">
      <div className="profile-card">
        <div className="profile-banner" />

        <div className="avatar-ring">
          <div className="avatar" role="img" aria-label="Avatar da Yaz" />
        </div>

        <div className="profile-name">yaz</div>
        <div className="profile-empty-pill" aria-hidden="true" />

        <div className="profile-bio">Use k!sobremim &lt;msg&gt; para alterar!</div>

        <section className="items-panel" aria-label="Itens equipados">
          {slots.map((slot, index) => (
            <div className="item-slot" key={`${slot}-${index}`}>
              <SlotPattern />
              {(index === 0 || index === 1) && <span className="pet-dot" aria-hidden="true">🐾</span>}
              <span>{slot}</span>
            </div>
          ))}
        </section>

        <section className="stats-grid" aria-label="Estatísticas do perfil">
          {stats.map((stat) => (
            <StatPill key={stat.text + stat.tone} {...stat} />
          ))}
        </section>
      </div>
    </main>
  );
}