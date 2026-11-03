import * as A from './api2.mjs';
const [,, inp, out, lv] = process.argv; const s = A.loadSave(inp); s.parties[0].level = +lv; s.parties[0].experience = 0; s.parties[0].characters = [...s.parties[0].characters]; A.writeSave(out, s);
