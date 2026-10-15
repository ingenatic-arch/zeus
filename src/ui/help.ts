/** The "?" card listing the controls, the compass, and the first-time hint. */
export interface Corner {
  toggleHelp(): void;
  setHeading(yaw: number): void;
}

export function buildCorner(root: HTMLElement, onNorth: () => void, showHint: boolean): Corner {
  const corner = document.createElement('div');
  corner.className = 'corner';
  corner.innerHTML = `
    <button class="btn compass" title="Face north (N)" aria-label="Face north">
      <svg viewBox="0 0 24 24"><g class="needle"><path d="M12 2.5l3.2 9.5h-6.4z" fill="#c8643b"/><path d="M12 21.5l-3.2-9.5h6.4z" fill="#7a5c3c" opacity="0.55"/></g></svg>
    </button>
    <button class="btn help-btn" title="Controls (?)" aria-label="Controls"><span class="help-q">?</span></button>`;
  root.appendChild(corner);

  const help = document.createElement('div');
  help.className = 'help';
  help.hidden = true;
  help.innerHTML = `
    <h2>Getting about</h2>
    <dl>
      <dt>Left-drag</dt><dd>Move across the land (with a tool picked: build)</dd>
      <dt>Middle-drag</dt><dd>Move across the land</dd>
      <dt>Right-drag</dt><dd>Turn and tilt the view</dd>
      <dt>Wheel</dt><dd>Zoom, down to street level</dd>
      <dt>W A S D</dt><dd>Move (or the arrow keys)</dd>
      <dt>Q / E</dt><dd>Turn a quarter left / right</dd>
      <dt>R / F</dt><dd>Tilt up / down</dd>
      <dt>+ / −</dt><dd>Zoom in / out</dd>
      <dt>N</dt><dd>Face north</dd>
    </dl>
    <h2 style="margin-top:12px">Building</h2>
    <dl>
      <dt>T</dt><dd>Road: drag to lay it</dd>
      <dt>H</dt><dd>Housing plots: click or drag</dd>
      <dt>X</dt><dd>Clear land: drag over it</dd>
      <dt>U / Ctrl+Z</dt><dd>Undo the last thing you built or cleared</dd>
      <dt>Esc</dt><dd>Put the tool down (or right-click)</dd>
    </dl>
    <h2 style="margin-top:12px">Time</h2>
    <dl>
      <dt>Space</dt><dd>Pause or carry on</dd>
      <dt>1 2 3</dt><dd>Normal, fast, fastest</dd>
    </dl>`;
  root.appendChild(help);

  const toggleHelp = (): void => {
    help.hidden = !help.hidden;
  };
  (corner.querySelector('.help-btn') as HTMLElement).addEventListener('click', toggleHelp);
  (corner.querySelector('.compass') as HTMLElement).addEventListener('click', onNorth);
  const needle = corner.querySelector('.needle') as SVGGElement;

  if (showHint) {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'Drag to move · right-drag to turn · scroll to zoom · ? for all controls';
    root.appendChild(hint);
    const dismiss = (): void => hint.classList.add('gone');
    setTimeout(dismiss, 9000);
    addEventListener('pointerdown', () => setTimeout(dismiss, 2500), { once: true });
  }

  let lastDeg = NaN;
  return {
    toggleHelp,
    setHeading(yaw: number) {
      const deg = Math.round((yaw * 180) / Math.PI);
      if (deg === lastDeg) return;
      lastDeg = deg;
      needle.setAttribute('transform', `rotate(${deg} 12 12)`);
    },
  };
}
