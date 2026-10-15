/** Decorative 3D manga-style artwork. Interface text owns investigation status. */
export type MartenPose = "observe" | "ready" | "investigate" | "think" | "report" | "rest";

export function MartenMascot({ pose = "observe", className = "" }: {
  pose?: MartenPose;
  className?: string;
}) {
  return (
    <img
      key={pose}
      className={`marten-mascot marten-${pose} ${className}`}
      src={`/mascot/marten-${pose}.png`}
      alt=""
      aria-hidden="true"
      width={1024}
      height={1024}
      decoding="async"
      draggable={false}
      data-pose={pose}
    />
  );
}
