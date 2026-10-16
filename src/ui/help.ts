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
      <dt>T</dt><dd>Road: drag to lay it (straight across a narrow river: a bridge)</dd>
      <dt>H</dt><dd>Housing plots: click or drag</dd>
      <dt>B</dt><dd>Fountain: click beside a road</dd>
      <dt>M</dt><dd>Wheat farm: on the green land by the river</dd>
      <dt>G</dt><dd>Granary: where the farms' carts take the wheat</dd>
      <dt>K</dt><dd>Agora: its food vendor sells bread to huts</dd>
      <dt>V</dt><dd>Shrine: its priestess blesses homes; blessed cottages become townhouses</dd>
      <dt>P</dt><dd>Theatre: its actor brings the plays; townhouses with plays become fine houses</dd>
      <dt>X</dt><dd>Clear land: drag over it</dd>
      <dt>U / Ctrl+Z</dt><dd>Undo the last thing you built or cleared (within about a month)</dd>
      <dt>Esc</dt><dd>Put the tool down (or right-click)</dd>
    </dl>
    <h2 style="margin-top:12px">Looking</h2>
    <dl>
      <dt>O</dt><dd>The water overlay: where water reaches</dd>
      <dt>L</dt><dd>The food overlay: where the food vendor reaches, and the farms and granaries</dd>
      <dt>Y</dt><dd>The religion overlay: where the priestess walks, and which homes are blessed</dd>
      <dt>C</dt><dd>The culture overlay: where the actor walks, and which homes have plays</dd>
      <dt>I</dt><dd>What's missing: red homes are about to go down a level, amber ones lack what they need to grow</dd>
      <dt>Hover</dt><dd>A home says who lives there and what reaches it; a workplace, how it is staffed</dd>
      <dt>Click</dt><dd>A home: meet the household who live there (Esc to close). A walker with a job, or where she works: follow her (drag or Esc to stop)</dd>
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
