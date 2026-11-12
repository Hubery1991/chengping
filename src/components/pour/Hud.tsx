import { useEffect, type ReactNode } from "react";
import {
  CircleHelp,
  Droplets,
  LayoutGrid,
  Lightbulb,
  Play,
  RotateCcw,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { TOTAL_LEVELS } from "@/game/levels";
import { useGame } from "@/game/store";

export function Hud() {
  const phase = useGame((s) => s.phase);
  const level = useGame((s) => s.level);
  const name = useGame((s) => s.name);
  const moves = useGame((s) => s.moves);
  const message = useGame((s) => s.message);
  const tone = useGame((s) => s.tone);
  const busy = useGame((s) => s.busy);
  const muted = useGame((s) => s.muted);
  const picker = useGame((s) => s.picker);
  const help = useGame((s) => s.help);
  const confirmRestart = useGame((s) => s.confirmRestart);
  const unlocked = useGame((s) => s.unlocked);
  const best = useGame((s) => s.best);
  const ready = useGame((s) => s.ready);
  const thinking = useGame((s) => s.thinking);
  const history = useGame((s) => s.history.length);
  const start = useGame((s) => s.start);
  const undo = useGame((s) => s.undo);
  const askRestart = useGame((s) => s.askRestart);
  const cancelRestart = useGame((s) => s.cancelRestart);
  const restart = useGame((s) => s.restart);
  const next = useGame((s) => s.next);
  const goto = useGame((s) => s.goto);
  const askHint = useGame((s) => s.askHint);
  const toggleMute = useGame((s) => s.toggleMute);
  const togglePicker = useGame((s) => s.togglePicker);
  const toggleHelp = useGame((s) => s.toggleHelp);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "Escape") {
        togglePicker(false);
        toggleHelp(false);
        cancelRestart();
        useGame.getState().clearSelection();
        return;
      }
      if (event.key === "z" || event.key === "Z") {
        event.preventDefault();
        undo();
        return;
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        askRestart();
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        useGame.getState().nudgeFocus(1);
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        useGame.getState().nudgeFocus(-1);
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        useGame.getState().activateFocus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [askRestart, cancelRestart, toggleHelp, togglePicker, undo]);

  const levelBest = best[String(level)];
  const cleared = Object.keys(best).length;
  const continueLabel = ready && (level > 0 || cleared > 0);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
      <div className="vignette pointer-events-none absolute inset-0" />
      <header className="flex items-start justify-between gap-3 p-4 sm:p-6">
        <div className="pointer-events-auto">
          <p className="text-xs tracking-widest text-gold">三维倒水</p>
          <h1 className="font-display text-3xl leading-none text-fg sm:text-4xl">澄瓶</h1>
          {phase !== "intro" && (
            <p className="mt-1 text-sm text-muted">
              第 {level + 1} 关 · {name}
            </p>
          )}
        </div>
        {phase !== "intro" && (
          <div className="pointer-events-auto rounded-2xl border border-line bg-raise/80 px-4 py-2 text-right backdrop-blur">
            <p className="text-xs text-muted">步数</p>
            <p className="font-display text-2xl tabular-nums leading-none text-fg">{moves}</p>
          </div>
        )}
      </header>

      <div className="flex-1" />

      {message && phase === "play" && (
        <p
          aria-live="polite"
          className={`mx-auto mb-3 max-w-md px-6 text-center text-sm ${
            tone === "bad" ? "text-danger" : tone === "good" ? "text-good" : "text-fg"
          }`}
        >
          {message}
        </p>
      )}

      {phase === "play" && (
        <div className="pointer-events-auto mx-auto mb-4 flex max-w-lg flex-wrap items-center justify-center gap-2 px-4 sm:mb-6">
          {confirmRestart ? (
            <div className="flex items-center gap-2 rounded-full border border-line bg-raise/90 px-3 py-2 backdrop-blur">
              <span className="px-2 text-sm text-fg">重开这一关？</span>
              <button
                type="button"
                className="h-11 rounded-full bg-gold px-4 text-sm font-semibold text-ink"
                onClick={restart}
              >
                重开
              </button>
              <button
                type="button"
                className="h-11 rounded-full px-4 text-sm text-muted"
                onClick={cancelRestart}
              >
                取消
              </button>
            </div>
          ) : (
            <>
              <IconButton label="撤销" disabled={busy || history === 0} onClick={undo}>
                <Undo2 />
              </IconButton>
              <IconButton label="重开" disabled={busy} onClick={askRestart}>
                <RotateCcw />
              </IconButton>
              <IconButton label="提示" disabled={busy || thinking} onClick={askHint}>
                <Lightbulb />
              </IconButton>
              <IconButton label="选关" onClick={() => togglePicker(true)}>
                <LayoutGrid />
              </IconButton>
              <IconButton label="怎么玩" onClick={() => toggleHelp(true)}>
                <CircleHelp />
              </IconButton>
              <IconButton label={muted ? "打开声音" : "关闭声音"} onClick={toggleMute}>
                {muted ? <VolumeX /> : <Volume2 />}
              </IconButton>
            </>
          )}
        </div>
      )}

      {phase === "intro" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4 sm:p-8">
          <section className="pointer-events-auto w-full max-w-lg rounded-3xl border border-line bg-raise/92 p-5 backdrop-blur sm:p-6">
            <div className="mb-3 flex items-center gap-2 text-gold">
              <Droplets className="size-4" />
              <span className="text-xs tracking-widest">把同色的水倒回同一只瓶</span>
            </div>
            <ol className="mb-5 space-y-2 text-sm text-fg">
              <li className="flex gap-3">
                <span className="font-display text-gold">01</span>
                点一只盛着水的瓶子，它会轻轻抬起
              </li>
              <li className="flex gap-3">
                <span className="font-display text-gold">02</span>
                再点空瓶，或瓶口颜色相同的瓶子
              </li>
              <li className="flex gap-3">
                <span className="font-display text-gold">03</span>
                每只瓶子只剩一种颜色，这一关就澄了
              </li>
            </ol>
            <button
              id="start-game"
              type="button"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gold text-base font-semibold text-ink"
              onClick={start}
            >
              <Play className="size-4" />
              {continueLabel ? `继续 · ${name}` : "开始倒水"}
            </button>
            <p className="mt-3 text-center text-xs text-muted">
              已澄 {cleared} / {TOTAL_LEVELS} 关
            </p>
          </section>
        </div>
      )}

      {phase === "won" && (
        <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-bg/55 p-4">
          <section className="w-full max-w-sm rounded-3xl border border-line bg-raise p-6 text-center">
            <p className="text-xs tracking-widest text-gold">澄澈</p>
            <h2 className="mt-2 font-display text-4xl text-fg">{name}</h2>
            <p className="mt-3 text-sm text-muted">
              用了 <span className="tabular-nums text-fg">{moves}</span> 步
              {levelBest ? (
                <>
                  {" "}
                  · 最佳 <span className="tabular-nums text-fg">{levelBest}</span> 步
                </>
              ) : null}
            </p>
            {message && <p className="mt-2 text-sm text-good">{message}</p>}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="h-12 flex-1 rounded-full border border-line text-sm text-fg"
                onClick={restart}
              >
                再来一次
              </button>
              <button
                type="button"
                className="h-12 flex-1 rounded-full bg-gold text-sm font-semibold text-ink"
                onClick={next}
              >
                {level >= TOTAL_LEVELS - 1 ? "回到初酌" : "下一关"}
              </button>
            </div>
          </section>
        </div>
      )}

      {help && phase !== "intro" && (
        <div className="pointer-events-auto absolute inset-0 grid place-items-end bg-bg/50 p-4 sm:place-items-center">
          <section className="w-full max-w-md rounded-3xl border border-line bg-raise p-5">
            <h2 className="font-display text-2xl text-fg">怎么倒</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>一次只会倒出瓶口那一段同色的水。</li>
              <li>对面必须是空瓶，或者瓶口颜色相同，而且装得下。</li>
              <li>键盘：方向键选瓶，回车倒水，Z 撤销，R 重开。</li>
            </ul>
            <button
              type="button"
              className="mt-5 h-11 w-full rounded-full bg-gold text-sm font-semibold text-ink"
              onClick={() => toggleHelp(false)}
            >
              知道了
            </button>
          </section>
        </div>
      )}

      {picker && (
        <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-bg/60 p-4">
          <section className="max-h-[80dvh] w-full max-w-lg overflow-auto rounded-3xl border border-line bg-raise p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl text-fg">选关</h2>
              <button type="button" className="h-11 px-3 text-sm text-muted" onClick={() => togglePicker(false)}>
                关闭
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: TOTAL_LEVELS }, (_, i) => {
                const locked = i > unlocked;
                const current = i === level;
                const done = best[String(i)] != null;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={locked || busy}
                    onClick={() => goto(i)}
                    className={`flex h-16 flex-col items-center justify-center rounded-2xl border text-sm ${
                      current
                        ? "border-gold bg-gold text-ink"
                        : "border-line bg-bg text-fg disabled:text-muted"
                    }`}
                  >
                    <span className="font-display text-lg tabular-nums leading-none">{i + 1}</span>
                    <span className="mt-1 text-xs">{locked ? "未开" : done ? `${best[String(i)]} 步` : "可玩"}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-12 w-12 place-items-center rounded-full border border-line bg-raise/90 text-fg backdrop-blur disabled:opacity-40 [&_svg]:size-5"
    >
      {children}
    </button>
  );
}
