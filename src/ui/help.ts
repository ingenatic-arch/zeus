/** The "?" card listing the controls, and the first-time hint. (North is the gold marker on the minimap's ring.) */
export interface Corner {
  /** The row of round buttons in the top right corner (more can go in, before the help button). */
  el: HTMLElement;
  /** Show or hide the controls card (toggles without an argument). */
  toggleHelp(show?: boolean): void;
  readonly helpOpen: boolean;
  /** Called when the controls card opens. */
  onHelpOpen(f: () => void): void;
}

/** `classic`: the original look's fixed view (it turns a quarter at a time and doesn't tilt). */
export function buildCorner(root: HTMLElement, showHint: boolean, classic = false): Corner {
  const corner = document.createElement('div');
  corner.className = 'corner';
  corner.innerHTML = `
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
      ${classic ? '<dt>Right-drag</dt><dd>Turn the view a quarter (drag sideways)</dd>' : '<dt>Right-drag</dt><dd>Turn and tilt the view</dd>'}
      ${classic ? '<dt>Wheel</dt><dd>Zoom</dd>' : '<dt>Wheel</dt><dd>Zoom, down to street level</dd>'}
      <dt>W A S D</dt><dd>Move (or the arrow keys)</dd>
      <dt>Q / E</dt><dd>Turn a quarter left / right</dd>
      ${classic ? '' : '<dt>R / F</dt><dd>Tilt up / down</dd>'}
      <dt>+ / −</dt><dd>Zoom in / out</dd>
      ${classic ? '<dt>N</dt><dd>Back to the first view, north to the upper left (or click the gold N on the minimap’s ring)</dd>' : '<dt>N</dt><dd>Face north (or click the gold N on the minimap’s ring)</dd>'}
    </dl>
    <h2 style="margin-top:12px">Building</h2>
    <p class="lead">The panel on the right has a tab for each kind of building: click a picture to pick it up. Road, clear, undo and the overlays are round the minimap. The keys:</p>
    <dl>
      <dt>T</dt><dd>Road: drag to lay it (straight across a narrow river: a bridge)</dd>
      <dt>H</dt><dd>Housing plots: click or drag; again for an estate’s plot (4 by 4, click beside a road: a noble house comes once the city has a villa)</dd>
      <dt>B</dt><dd>Fountain: click beside a road; again for a copper mine (on the green-streaked rock it shows), an armoury, a barracks, a wall (drag it like a road: a gate where it crosses one), a tower (on or beside a wall) and a shipyard (on the bay shore)</dd>
      <dt>M</dt><dd>Farms and workshops, again for the next: wheat farm (on the green land by the river), hunting lodge (near the deer or the boar), dairy and sheep pasture (on green grass), olive grove and olive press, vineyard (on the sunny slopes) and winery, marble quarry (on the pale rock of the headland), loggers’ camp (at a wood’s edge) and horse farm (on green grass)</dd>
      <dt>Shift G</dt><dd>Granary (wheat, meat and cheese), again for a storehouse (oil, fleece, wine, copper, armour, marble, timber and horses), again for the trading post (on the bay shore), and again for the caravan yard (on a road, for the caravans from Greece)</dd><!-- (Slice 53: G is Olympus.) -->
      <dt>K</dt><dd>Agora: its food vendor sells bread, meat and cheese; again for an oil, a fleece or a wine stall, clicked onto an agora</dd>
      <dt>V</dt><dd>Shrine: its priestess blesses homes; townhouses need her blessing</dd>
      <dt>P</dt><dd>Theatre: its actor brings the plays; fine houses need them</dd>
      <dt>Z</dt><dd>Tax office: its tax collector brings in each household’s taxes; again for a watch post (its watchman keeps fire away, and thieves: homes he walks by are less tempted to steal or worse, and he runs after any criminal he sees; two whose rounds reach a gang’s den break it up), and again for an architect’s office (its inspector keeps buildings from falling, and mends what vandals smash); again for a court (its magistrate and jurors try the caught by the law you set: click it) and again for a prison (its guards hold the court’s prisoners; keep it staffed and from overflowing, or they break out); again for an infirmary (its physicians call on every home beside their way, keeping it healthy, and tend the sick) and again for the asklepieion (its stretcher-bearers carry the sick to its beds; homes round it are healthier, and resist plague). A home’s health comes from water, food, a physician’s calls and fresh air; a sickly one falls ill, and the sick don’t work. Plague comes on a ship or caravan from a plagued city (you are warned first: a quarantine, on the infirmary’s or the trade panel, holds them off) or from a crowded, sickly quarter in summer</dd>
      <dt>Shift</dt><dd>With M, K or Z: back to the one before</dd>
      <dt>Monuments</dt><dd>On the Monuments tab (no key: every letter is taken): the masons’ yard, whose builders build the monuments, and the Lighthouse (high over the sea), the Colossus (by deep water) and the Stadium. Each goes up in three stages, a stage starting once its marble, timber or bronze is all on site</dd>
      <dt>X</dt><dd>Clear land: drag over it (rubble costs a little to clear)</dd>
      <dt>U / Ctrl+Z</dt><dd>Undo the last thing you built or cleared (within about a month)</dd>
      <dt>Esc</dt><dd>Put the tool down (or right-click)</dd>
    </dl>
    <h2 style="margin-top:12px">Soldiers</h2>
    <dl>
      <dt>Click</dt><dd>A company’s banner, one of its men, or its row on the Military tab: take its banner in hand</dd>
      <dt>Then click</dt><dd>Where it should stand (or drag the banner there): it marches by the shortest way and holds, fighting any raider who comes near. The tip says how many days away it is</dd>
      <dt>Esc</dt><dd>Put the banner down (or right-click). Orders work while paused</dd>
    </dl>
    <h2 style="margin-top:12px">Looking</h2>
    <dl>
      <dt>Shift O</dt><dd>The water overlay: where water reaches</dd><!-- (Slice 51: O is the overview.) -->
      <dt>L</dt><dd>The food overlay: where the food vendor reaches, and the farms, lodges, dairies and granaries</dd>
      <dt>L L</dt><dd>Food variety: what is on each home’s table, and the kinds it is short of; again for oil, fleece and wine</dd>
      <dt>Y</dt><dd>The religion overlay: where the priestess walks, and which homes are blessed</dd>
      <dt>C</dt><dd>The culture overlay: where the actor walks, and which homes have plays</dd>
      <dt>J</dt><dd>The tax overlay: where the tax collector walks, and which homes have paid this month; again for fire risk, again for wear, and again for crime (which homes are tempted to steal or worse, which were robbed, gangs’ dens, and places smashed or worked by pickpockets and smugglers; each home coloured by the crime it would turn to), and again for health (each home green, amber or red by its health, a column the taller the sicker it is, pale where someone is sick and plum where the plague is; the roads the physicians have walked)</dd>
      <!-- Slice 39 -->
      <dt>Laurel</dt><dd>The ambitions (the wreath at the end of the top bar): the milestone you are nearest, and how far along; click it for all three side by side, Master of Greece, the great trading city and a city of wonders, each with its five milestones, what each wants and its reward</dd>
      <dt>$</dt><dd>The ledger: what came in and went out, this month and last (or click the drachmas); the chip beside them sets the taxes</dd>
      <dt>I</dt><dd>What’s missing: red homes are about to go down a level, amber ones lack what they need to grow</dd>
      <dt>Hover</dt><dd>A home says who lives there and what reaches it; a workplace, how it is staffed; a caravan, a ship, a soldier, a raider or a trireme, who they are and what they are doing; a wall, a gate or a tower, how strong it is</dd>
      <dt>Click</dt><dd>A home: meet the household who live there (Esc to close). A walker with a job, or where she works: follow her (drag or Esc to stop). The trading post, the caravan yard, or the traders beside the drachmas: choose what to sell and buy. The barracks or the shipyard: its companies or triremes, on the Military tab</dd>
      <dt>Tab</dt><dd>The map of Greece: its cities and rulers, their prices, your routes and loans (a city’s Loans tab: borrow, lend, repay), and sea lanes to guard (Tab again, or the City button, to come back)</dd>
      <!-- Slice 44 -->
      <dt>&#96;</dt><dd>Messages, or the small scroll beside the date (its seal counts what you haven’t read): everything the town has heard, by month, with filters, pins and a link to where each happened, and what the rulers wait on you for at its top. Only alarms pop up, at the bottom left; you choose which</dd>
      <!-- Slice 51 -->
      <dt>O</dt><dd>The overview, or the tablet beside the scroll: the whole city on one page for each of the advisers (the city, goods, treasury, distribution, crime, health, the army and fleet, the empire), with two years of each in small charts and why each stands where it does. Its links fly you to the place, with the overlay that shows it</dd>
      <!-- Slice 53 -->
      <dt>G</dt><dd>Olympus, or the thunderbolt beside the tablet: the twelve gods, each with their mood and why, what they love and hate in a city, the rival who grows jealous when you honour the other, and their shrines. Dedicate a shrine from its panel; hold a festival there (coin and a sacred good) or send an offering from the stores</dd>
    </dl>
    <h2 style="margin-top:12px">Time</h2>
    <dl>
      <dt>Space</dt><dd>Pause or carry on, even with a panel’s button in focus (Enter presses the button)</dd>
      <dt>1 2 3</dt><dd>Normal, fast, fastest</dd>
    </dl>
    <h2 style="margin-top:12px">Keeping the town</h2>
    <dl>
      <dt>Ctrl+S</dt><dd>Save the town (the scroll button keeps your saves; the game also saves itself every three months once you’ve built something)</dd>
    </dl>`;
  root.appendChild(help);

  const opened: Array<() => void> = [];
  const toggleHelp = (show = help.hidden): void => {
    help.hidden = !show;
    if (show) for (const f of opened) f();
  };
  (corner.querySelector('.help-btn') as HTMLElement).addEventListener('click', () => toggleHelp());

  if (showHint) {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'Drag to move · right-drag to turn · scroll to zoom · ? for all controls';
    root.appendChild(hint);
    const dismiss = (): void => hint.classList.add('gone');
    setTimeout(dismiss, 9000);
    addEventListener('pointerdown', () => setTimeout(dismiss, 2500), { once: true });
  }

  return {
    el: corner,
    toggleHelp,
    get helpOpen() {
      return !help.hidden;
    },
    onHelpOpen: (f) => void opened.push(f),
  };
}
