/**
 * If the town screen crashes, say so and offer a way out instead of leaving a
 * blank page. The autosave is untouched (it only runs after the screen draws),
 * so the player can download it, and the bug can be fixed without losing it.
 */
import { Component, type ReactNode } from "react";
import { activeRaw, downloadRaw } from "./saves";

export class CrashGuard extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const save = activeRaw();
    return (
      <section className="panel" aria-labelledby="crash-heading">
        <h2 id="crash-heading">Something went wrong</h2>
        <p className="error" role="alert">
          {error.message}
        </p>
        <p>
          The game hit a bug. Your guild was saved before it happened. Download the save to keep it
          safe, then try reloading the page.
        </p>
        <p className="small">
          <button type="button" className="btn btn-main" onClick={() => location.reload()}>
            Reload the page
          </button>{" "}
          {save ? (
            <button type="button" className="btn" onClick={() => downloadRaw(save.slot, save.raw)}>
              Download the save
            </button>
          ) : null}
        </p>
      </section>
    );
  }
}
