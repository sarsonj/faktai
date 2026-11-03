import { validateFuXml } from './fu-xsd-validator';

describe('validateFuXml', () => {
  it('reports wrong section order in control statement (CR-0050 regression)', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Pisemnost nazevSW="TappyFaktur" verzeSW="1.0.0">
  <DPHKH1 verzePis="01.02.01">
    <VetaD k_uladis="DPH" dokument="KH1" rok="2026" mesic="1" khdph_forma="B" d_poddp="03.02.2026"/>
    <VetaP dic="7705203044" typ_ds="F" jmeno="Jan" prijmeni="Novak" c_pracufo="2705" c_ufo="458"/>
    <VetaC obrat23="1000.00"/>
    <VetaA4 dic_odb="24755851" c_evid_dd="1" dppd="15.01.2026" zakl_dane1="20000.00" dan1="4200.00" kod_rezim_pl="0" zdph_44="N"/>
  </DPHKH1>
</Pisemnost>`;
    const errors = await validateFuXml(xml, 'KH1');
    expect(errors.join('\n')).toContain('VetaA4');
  });

  it('reports attribute facet violations', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Pisemnost><DPHDP3 verzePis="01.02.01"><VetaD k_uladis="DPH" dokument="DP3" rok="2026" mesic="1" dapdph_forma="B" typ_platce="P" c_okec=""/></DPHDP3></Pisemnost>`;
    const errors = await validateFuXml(xml, 'DP3');
    expect(errors.join('\n')).toContain('c_okec');
  });
});
