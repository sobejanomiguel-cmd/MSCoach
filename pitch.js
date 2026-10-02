    function renderTacticalPitchHtml(filteredPlayers, formationId = 'F11_433', orientation = 'horizontal') {
        const activeFormation = FORMATIONS[formationId] || FORMATIONS['F11_433'];

        // Force vertical on mobile for better visibility
        if (window.innerWidth < 768) orientation = 'vertical';
        const isVert = orientation === 'vertical';

        const aspect = isVert ? 'aspect-[2/3]' : 'aspect-[3/2]';
        const bgGradient = isVert ?
            'repeating-linear-gradient(0deg, #1a4d2e, #1a4d2e 40px, #164328 40px, #164328 80px)' :
            'repeating-linear-gradient(90deg, #1a4d2e, #1a4d2e 40px, #164328 40px, #164328 80px)';

        return `
            <div class="relative w-full mx-auto ${aspect} max-h-[70vh] md:max-h-[85vh] bg-[#1a4d2e] rounded-xl p-4 shadow-xl overflow-hidden border-[10px] border-[#133a22] group/pitch">
                <!-- Grass Stripes -->
                <div class="absolute inset-0 pointer-events-none" style="background: ${bgGradient};"></div>
                
                <!-- Pitch Lines -->
                <div class="absolute inset-4 border-2 border-white/20 rounded-lg pointer-events-none">
                    ${isVert ? `
                        <!-- Vertical Pitch Lines -->
                        <div class="absolute top-1/2 left-0 right-0 h-[2px] bg-white/20"></div>
                        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/20 rounded-full"></div>
                        <!-- Bottom Area -->
                        <div class="absolute bottom-0 left-1/2 -translate-x-1/2 h-[18%] w-[68%] border-2 border-white/20 border-b-0"></div>
                        <div class="absolute bottom-0 left-1/2 -translate-x-1/2 h-[6%] w-[32%] border-2 border-white/20 border-b-0"></div>
                        <div class="absolute bottom-[18%] left-1/2 -translate-x-1/2 h-[8%] w-[30%] border-2 border-white/20 border-b-0 rounded-t-full"></div>
                        <!-- Top Area -->
                        <div class="absolute top-0 left-1/2 -translate-x-1/2 h-[18%] w-[68%] border-2 border-white/20 border-t-0"></div>
                        <div class="absolute top-0 left-1/2 -translate-x-1/2 h-[6%] w-[32%] border-2 border-white/20 border-t-0"></div>
                        <div class="absolute top-[18%] left-1/2 -translate-x-1/2 h-[8%] w-[30%] border-2 border-white/20 border-t-0 rounded-b-full"></div>
                    ` : `
                        <!-- Horizontal Pitch Lines -->
                        <div class="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/20"></div>
                        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/20 rounded-full"></div>
                        <!-- Left Area -->
                        <div class="absolute left-0 top-1/2 -translate-y-1/2 w-[18%] h-[68%] border-2 border-white/20 border-l-0"></div>
                        <div class="absolute left-0 top-1/2 -translate-y-1/2 w-[6%] h-[32%] border-2 border-white/20 border-l-0"></div>
                        <div class="absolute left-[18%] top-1/2 -translate-y-1/2 w-[8%] h-[30%] border-2 border-white/20 border-l-0 rounded-r-full"></div>
                        <!-- Right Area -->
                        <div class="absolute right-0 top-1/2 -translate-y-1/2 w-[18%] h-[68%] border-2 border-white/20 border-r-0"></div>
                        <div class="absolute right-0 top-1/2 -translate-y-1/2 w-[6%] h-[32%] border-2 border-white/20 border-r-0"></div>
                        <div class="absolute right-[18%] top-1/2 -translate-y-1/2 w-[8%] h-[30%] border-2 border-white/20 border-r-0 rounded-l-full"></div>
                    `}
                </div>

                ${(() => {
                const assignments = activeFormation.positions.map(() => []);

                const checkMatch = (pPos, targetSlot) => {
                    const groupingRules = [
                        { key: 'CT', list: ['CT', 'CTD', 'CTI'] }
                    ];
                    for (const rule of groupingRules) {
                        if (rule.list.includes(targetSlot)) {
                            const countInFormation = activeFormation.positions.filter(p => rule.list.includes(p.pos)).length;
                            if (countInFormation === 1) return rule.list.includes(pPos);
                        }
                    }
                    const staticGroups = {
                        'PT': ['PT', 'PO', 'POR', 'GK'],
                        'LTD': ['LTD', 'DBD', 'LD', 'CAD'],
                        'LTI': ['LTI', 'DBZ', 'LI', 'CAI'],
                        'CTD': ['CTD', 'DCD', 'DFC', 'CD', 'CT'],
                        'CTI': ['CTI', 'DCZ', 'DFC', 'CZ', 'CT'],
                        'CT': ['CT', 'CTD', 'CTI', 'DCD', 'DCZ', 'DC'],
                        'MC': ['MC', 'MCD', 'MCZ'],
                        'INT': ['INT', 'MVD', 'MVZ'],
                        'MP': ['MP', 'MPD', 'MPZ'],
                        'ED': ['ED', 'MBD'],
                        'EI': ['EI', 'MBZ'],
                        'DC': ['DC', 'ACD', 'ACZ', 'AC']
                    };
                    if (staticGroups[targetSlot]) return staticGroups[targetSlot].includes(pPos);
                    return pPos === targetSlot;
                };

                (filteredPlayers || []).forEach(player => {
                    const choices = window.parsePosition(player.posicion);
                    if (choices.length === 0) return;

                    let validSlots = [];
                    activeFormation.positions.forEach((s, idx) => {
                        if (checkMatch(choices[0], s.pos)) validSlots.push({ idx, priority: 1 });
                    });
                    if (choices[1]) {
                        activeFormation.positions.forEach((s, idx) => {
                            if (checkMatch(choices[1], s.pos)) validSlots.push({ idx, priority: 2 });
                        });
                    }

                    if (validSlots.length === 0) return;

                    validSlots.sort((a, b) => {
                        const countA = assignments[a.idx].length;
                        const countB = assignments[b.idx].length;
                        if (countA !== countB) return countA - countB;
                        return a.priority - b.priority;
                    });

                    assignments[validSlots[0].idx].push(player);
                });

                return activeFormation.positions.map((pos, idx) => {
                    let displayPos = pos.pos;
                    const playersInPos = assignments[idx];

                    const groupingRules = [
                        { key: 'CT', list: ['CT', 'CTD', 'CTI'] }
                    ];
                    for (const rule of groupingRules) {
                        if (rule.list.includes(pos.pos)) {
                            const countInFormation = activeFormation.positions.filter(p => rule.list.includes(p.pos)).length;
                            if (countInFormation === 1) displayPos = rule.key;
                        }
                    }

                    // Map coordinates based on orientation
                    const left = isVert ? pos.y : pos.x;
                    const top = isVert ? (100 - pos.x) : pos.y;

                    return `
                        <div class="absolute flex flex-col items-center" style="left: ${left}%; top: ${top}%; transform: translate(-50%, -50%); z-index: 10;">
                            <div class="w-8 h-8 bg-white/95 rounded-full flex items-center justify-center shadow-lg mb-1 border-2 border-slate-900/10">
                                <span class="text-[9px] font-black text-slate-800">${displayPos}</span>
                            </div>
                            ${playersInPos.length > 0 ? `
                            <div class="bg-slate-900/95 backdrop-blur-md border border-white/10 p-1.5 rounded-xl shadow-2xl w-[115px]">
                                <div class="flex flex-col gap-1 max-h-[68px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full pr-0.5">
                                    ${playersInPos.map(player => `
                                        <div onclick="window.viewPlayerProfile('${player.id}')" class="flex flex-col items-center border-b border-white/10 last:border-0 py-1 first:pt-0 last:pb-0 shrink-0 cursor-pointer hover:bg-white/10 px-1 rounded transition-colors group/player">
                                            <p class="text-[8px] font-black text-white text-center capitalize truncate w-full">${(() => {
                                const parts = player.nombre.trim().split(/\s+/);
                                return parts.length > 1 ? `${parts[0]} ${parts[1]}` : parts[0];
                            })()}</p>
                                            <div class="flex justify-center gap-0.5 mt-[2px]">
                                                ${Array(Number(player.nivel || 3)).fill(0).map(() => `<div class="w-1 h-1 bg-amber-400 rounded-full"></div>`).join('')}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')
            })()}
            </div>
        `;
    }
