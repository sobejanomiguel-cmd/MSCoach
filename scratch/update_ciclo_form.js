const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

const oldCicloForm = /\/\* SESION 1 \*\/[\s\S]*?<div class="grid grid-cols-3 gap-3">[\s\S]*?<input name="fecha"[\s\S]*?<input name="hora"[\s\S]*?<input name="lugar"[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\/\* SESION 2 \*\/[\s\S]*?<div class="grid grid-cols-3 gap-3">[\s\S]*?<input name="fecha2"[\s\S]*?<input name="hora2"[\s\S]*?<input name="lugar2"[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\/\* SESION 3 \*\/[\s\S]*?<div class="grid grid-cols-3 gap-3">[\s\S]*?<input name="fecha3"[\s\S]*?<input name="hora3"[\s\S]*?<input name="lugar3"[\s\S]*?<\/div>[\s\S]*?<\/div>/;

const newCicloForm = `<!-- SESION 1 -->
                                <div class="col-span-1 md:col-span-2 p-6 bg-blue-50/30 rounded-[2rem] border border-blue-100/50">
                                    <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">Sesión 1</p>
                                    <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <div class="md:col-span-1">
                                            <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Fecha</label>
                                            <input name="fecha" type="date" class="w-full p-3 border rounded-xl outline-none text-xs" required>
                                        </div>
                                        <div class="md:col-span-3 grid grid-cols-3 gap-2">
                                            <div>
                                                <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Llegada</label>
                                                <input name="hl" type="time" class="w-full p-3 border rounded-xl outline-none text-xs">
                                            </div>
                                            <div>
                                                <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Inicio</label>
                                                <input name="hi" type="time" class="w-full p-3 border rounded-xl outline-none text-xs" required>
                                            </div>
                                            <div>
                                                <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Fin</label>
                                                <input name="hs" type="time" class="w-full p-3 border rounded-xl outline-none text-xs">
                                            </div>
                                        </div>
                                        <div class="md:col-span-4">
                                            <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Lugar</label>
                                            <input name="lugar" class="w-full p-3 border rounded-xl outline-none text-xs" placeholder="Lugar Sesión 1">
                                        </div>
                                    </div>
                                </div>
                                <!-- SESION 2 -->
                                <div class="col-span-1 md:col-span-2 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Sesión 2</p>
                                    <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <div class="md:col-span-1">
                                            <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Fecha</label>
                                            <input name="fecha2" type="date" class="w-full p-3 border rounded-xl outline-none text-xs">
                                        </div>
                                        <div class="md:col-span-3 grid grid-cols-3 gap-2">
                                            <div>
                                                <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Llegada</label>
                                                <input name="hl2" type="time" class="w-full p-3 border rounded-xl outline-none text-xs">
                                            </div>
                                            <div>
                                                <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Inicio</label>
                                                <input name="hi2" type="time" class="w-full p-3 border rounded-xl outline-none text-xs">
                                            </div>
                                            <div>
                                                <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Fin</label>
                                                <input name="hi2" type="time" class="w-full p-3 border rounded-xl outline-none text-xs">
                                            </div>
                                        </div>
                                        <div class="md:col-span-4">
                                            <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Lugar</label>
                                            <input name="lugar2" class="w-full p-3 border rounded-xl outline-none text-xs" placeholder="Lugar Sesión 2">
                                        </div>
                                    </div>
                                </div>
                                <!-- SESION 3 -->
                                <div class="col-span-1 md:col-span-2 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Sesión 3</p>
                                    <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <div class="md:col-span-1">
                                            <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Fecha</label>
                                            <input name="fecha3" type="date" class="w-full p-3 border rounded-xl outline-none text-xs">
                                        </div>
                                        <div class="md:col-span-3 grid grid-cols-3 gap-2">
                                            <div>
                                                <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Llegada</label>
                                                <input name="hl3" type="time" class="w-full p-3 border rounded-xl outline-none text-xs">
                                            </div>
                                            <div>
                                                <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Inicio</label>
                                                <input name="hi3" type="time" class="w-full p-3 border rounded-xl outline-none text-xs">
                                            </div>
                                            <div>
                                                <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Fin</label>
                                                <input name="hs3" type="time" class="w-full p-3 border rounded-xl outline-none text-xs">
                                            </div>
                                        </div>
                                        <div class="md:col-span-4">
                                            <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Lugar</label>
                                            <input name="lugar3" class="w-full p-3 border rounded-xl outline-none text-xs" placeholder="Lugar Sesión 3">
                                        </div>
                                    </div>
                                </div>`;

let updated = content.replace(oldCicloForm, newCicloForm);

// Update submit handler
const oldExtra = /const extra = \{[\s\S]*?s2: \{ f: data\.fecha2, h: data\.hora2, l: \(data\.lugar2 \|\| ''\)\.toUpperCase\(\)\.trim\(\) \},[\s\S]*?s3: \{ f: data\.fecha3, h: data\.hora3, l: \(data\.lugar3 \|\| ''\)\.toUpperCase\(\)\.trim\(\) \},[\s\S]*?hl: data\.hora_llegada,[\s\S]*?hi: data\.hora_inicio,[\s\S]*?hs: data\.hora_salida,[\s\S]*?sw: data\.sharedWith,[\s\S]*?eids: checkedTeamIds[\s\S]*?\};/;

const newExtra = `const extra = {
                        hl: data.hl || data.hora_llegada,
                        hi: data.hi || data.hora_inicio || data.hora,
                        hs: data.hs || data.hora_salida,
                        s2: { 
                            f: data.fecha2, 
                            hl: data.hl2, 
                            hi: data.hi2 || data.hora2, 
                            hs: data.hs2, 
                            l: (data.lugar2 || '').toUpperCase().trim() 
                        },
                        s3: { 
                            f: data.fecha3, 
                            hl: data.hl3, 
                            hi: data.hi3 || data.hora3, 
                            hs: data.hs3, 
                            l: (data.lugar3 || '').toUpperCase().trim() 
                        },
                        sw: data.sharedWith,
                        eids: checkedTeamIds
                    };`;

updated = updated.replace(oldExtra, newExtra);

// Update cleanup in submit handler
updated = updated.replace("['fecha2','hora2','lugar2','fecha3','hora3','lugar3','sharedWith', 'hora_llegada', 'hora_inicio', 'hora_salida']", "['fecha2','hora2','lugar2','fecha3','hora3','lugar3','sharedWith', 'hora_llegada', 'hora_inicio', 'hora_salida', 'hl', 'hi', 'hs', 'hl2', 'hi2', 'hs2', 'hl3', 'hi3', 'hs3']");

fs.writeFileSync('app.js', updated);
console.log('Success');
