/* eslint-disable @next/next/no-img-element */
export type ExerciseMotionType = "squat" | "hinge" | "push" | "pull" | "lunge" | "plank" | "curl" | "press" | "custom";

export function ExerciseMotion({
  type = "custom",
  mediaUrl,
  label,
  compact = false,
}: {
  type?: ExerciseMotionType | string;
  mediaUrl?: string | null;
  label: string;
  compact?: boolean;
}) {
  if (mediaUrl) {
    return (
      <div className={compact ? "exercise-motion compact media" : "exercise-motion media"}>
        <img src={mediaUrl} alt={`${label} exercise demonstration`} loading="lazy" referrerPolicy="no-referrer" />
      </div>
    );
  }

  return (
    <div className={compact ? `exercise-motion compact motion-${type}` : `exercise-motion motion-${type}`} aria-label={`${label} animated movement guide`} role="img">
      <svg viewBox="0 0 160 150" aria-hidden="true">
        <path className="motion-floor" d="M20 132H140" />
        <g className="motion-figure">
          <circle className="motion-head" cx="80" cy="28" r="11" />
          <path className="motion-torso" d="M80 40L80 82" />
          <path className="motion-arm motion-arm-left" d="M80 49L56 69L45 91" />
          <path className="motion-arm motion-arm-right" d="M80 49L104 69L115 91" />
          <path className="motion-leg motion-leg-left" d="M80 82L61 104L51 132" />
          <path className="motion-leg motion-leg-right" d="M80 82L99 104L109 132" />
          <circle className="motion-joint" cx="80" cy="49" r="3" />
          <circle className="motion-joint" cx="80" cy="82" r="3" />
        </g>
        <path className="motion-arrow" d="M127 44C139 60 139 79 127 94" />
        <path className="motion-arrow-tip" d="M123 88L127 95L133 89" />
      </svg>
      <span>{type === "custom" ? "Motion preview" : type}</span>
    </div>
  );
}
