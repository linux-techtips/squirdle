type NavbarProps = {
  title?: string;
  onGoHome?: () => void;
  onOpenProfile?: () => void;
  onOpenPokedex?: () => void;
  onOpenSettings?: () => void;
};

export default function Navbar({
  title = "Squirdle",
  onGoHome,
  onOpenProfile,
  onOpenPokedex,
  onOpenSettings,
}: NavbarProps) {
  return (
    <header className="navbar">
      <div className="navbar-left">
        <h2
          className="navbar-title"
          onClick={() => onGoHome?.()}
          style={{ cursor: "pointer" }}
        >
          {title}
        </h2>
      </div>

      <nav className="navbar-right">
        <button
          className="nav-btn"
          type="button"
          onClick={() => onOpenProfile?.()}
        >
          Profile
        </button>

        <button
          className="nav-btn"
          type="button"
          onClick={() => onOpenPokedex?.()}
        >
          Pokédex
        </button>

        <button
          className="nav-btn"
          type="button"
          onClick={() => onOpenSettings?.()}
        >
          Settings
        </button>

        <button className="nav-btn logout-btn" type="button">
          Logout
        </button>
      </nav>
    </header>
  );
}