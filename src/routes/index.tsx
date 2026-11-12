import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Hud } from "@/components/pour/Hud";
import { useGame } from "@/game/store";
import { World } from "@/components/pour/World";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [mounted, setMounted] = useState(false);
  const hydrate = useGame((s) => s.hydrate);
  const phase = useGame((s) => s.phase);

  useEffect(() => {
    hydrate();
    setMounted(true);
  }, [hydrate]);

  const band =
    phase === "intro"
      ? "absolute inset-x-0 top-24 bottom-80"
      : "absolute inset-x-0 top-20 bottom-24 sm:top-24 sm:bottom-28";

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg select-none">
      <div className={band}>{mounted ? <World /> : null}</div>
      <Hud />
    </main>
  );
}
