interface LocationButtonProps {
  coordinates: [number, number];
  onClick: () => void;
}

export function LocationButton({ coordinates, onClick }: LocationButtonProps) {
  return (
    <button
      onClick={onClick}
      className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50"
      title={`View location (${coordinates[0]}, ${coordinates[1]}) on map`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <span className="sr-only">View on map</span>
    </button>
  );
}
