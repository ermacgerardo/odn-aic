// Sincroniza el tablero con la fuente oficial mantenida en data/latest.json.
// Este archivo se carga al final de index.html, despuÃ©s de los grÃ¡ficos.
(function(){
  'use strict';

  const MONTHS={Ene:0,Feb:1,Mar:2,Abr:3,May:4,Jun:5,Jul:6,Ago:7,Sep:8,Oct:9,Nov:10,Dic:11};
  const byId=id=>document.getElementById(id);
  const dateValue=label=>{
    const p=String(label||'').split(' ');
    return p.length===3?new Date(Number(p[2]),MONTHS[p[1]]??0,Number(p[0])).getTime():0;
  };
  const signed=value=>Math.abs(value)<0.005?'â 0.00':`${value>0?'â² +':'â¼ â'}${Math.abs(value).toFixed(2)}`;

  // El archivo JSON es la Ãºnica vÃ­a de actualizaciÃ³n. Se anula el flujo manual
  // anterior antes de DOMContentLoaded y se retiran sus controles del documento.
  window.actualizarDatos=async()=>{};
  byId('btn-actualizar')?.remove();
  byId('update-status')?.remove();

  function prepareTargets(){
    const subtitle=document.querySelector('p.subtitle');
    if(subtitle) subtitle.id='site-period';

    const bombSource=document.querySelector('#bombBox .chart-source');
    if(bombSource) bombSource.id='bomb-source';

    const stats=document.querySelectorAll('#tab-graficos .stats .sc');
    const max=stats[1]?.children;
    if(max){max[0].id='stat-max-sup-label';max[1].id='stat-max-sup';max[2].id='stat-max-sup-sub';max[3].id='stat-max-sup-tip';}
    const min=stats[2]?.children;
    if(min) min[1].id='stat-min-die';
    const current=stats[3]?.children;
    if(current){current[1].id='stat-current-sup';current[2].id='stat-current-change';current[3].id='stat-current-tip';}

    const sourceBars=[...document.querySelectorAll('.source-bar')];
    const coverageBar=sourceBars.find(el=>el.textContent.includes('Cobertura:'));
    if(coverageBar){
      const coverage=[...coverageBar.children].find(el=>el.textContent.includes('Cobertura:'));
      if(coverage) coverage.id='coverage-summary';
    }
    const govHint=document.querySelector('#govBox .chint');
    if(govHint) govHint.id='gov-latest-hint';

    const latestCard=byId('ev9-detail')?.closest('.tl-card');
    if(latestCard){
      latestCard.querySelector('.tl-date').id='timeline-latest-date';
      latestCard.querySelector('.tl-card-title').id='timeline-latest-title';
      latestCard.querySelector('.tl-badges').id='timeline-latest-badges';
      latestCard.querySelector('.tl-detail p').id='timeline-latest-text';
      latestCard.querySelector('.tl-pills').id='timeline-latest-pills';
    }

    const policy=byId('asf-tabla3');
    if(policy){
      const body=policy.querySelector('.pol-body');
      if(body){
        const intro=body.querySelector(':scope > p');
        const tbody=body.querySelector('tbody');
        const note=body.querySelector('.tbl-scroll > p');
        if(intro) intro.id='policy-current-intro';
        if(tbody) tbody.id='policy-current-tbody';
        if(note) note.id='policy-current-note';
      }
    }

    document.querySelectorAll('.anx-step').forEach(step=>{
      const title=step.querySelector('.anx-step-title')?.textContent||'';
      const text=step.querySelector('.anx-step-text');
      if(!text) return;
      if(title.startsWith('Datos WTI')) text.id='method-wti';
      if(title.startsWith('Procesamiento')) text.id='method-processing';
      if(title.startsWith('Limitaciones')) text.id='method-limitations';
    });
    const footer=document.querySelector('.footer');
    if(footer) footer.id='site-footer';
  }

  function mergeRows(rows){
    const latestMax=Math.max(...rows.map(r=>dateValue(r.fecha)));
    const byDate=new Map(BOMB.filter(r=>dateValue(r[0])<=latestMax).map(r=>[r[0],r]));
    rows.forEach(row=>{
      const sup=Number(row.sup),reg=Number(row.reg),die=Number(row.die);
      if(row.fecha&&[sup,reg,die].every(Number.isFinite)){
        byDate.set(row.fecha,[row.fecha,String(row.anio||row.fecha.slice(-4)),sup,reg,die]);
      }
    });
    BOMB.splice(0,BOMB.length,...[...byDate.values()].sort((a,b)=>dateValue(a[0])-dateValue(b[0])));
  }

  function updateText(data){
    const meta=data.meta||{};
    const last=BOMB.at(-1),prev=BOMB.at(-2)||last;
    const yearStart=BOMB.find(r=>r[1]===last[1])||last;
    const lastDate=last[0],subsidy=Number(meta.regular_diesel_subsidy_pct)||0;
    const weekly={sup:last[2]-prev[2],reg:last[3]-prev[3],die:last[4]-prev[4]};
    const annual={sup:last[2]-yearStart[2],reg:last[3]-yearStart[3],die:last[4]-yearStart[4]};
    const wtiCutoff=meta.wti_last_month||'Abr 2026';
    window._dlLastDate=lastDate;
    window._latestMeta=meta;
    BOMB_EVENTS[lastDate]=`ð Ãltimo dato SEN: Superior L ${last[2].toFixed(2)}`;

    if(byId('site-period')) byId('site-period').textContent=`Precio WTI (referencia internacional) Â· Gasolina Superior Â· Regular Â· DiÃ©sel Â· L/galÃ³n en bomba Â· Enero 2022 â ${lastDate}`;
    const chartPeriod=document.querySelector('#bombBox .chart-period');
    if(chartPeriod) chartPeriod.textContent=`Tegucigalpa (L/galÃ³n) Â· PerÃ­odo de observaciÃ³n: enero 2022 â ${lastDate}`;
    if(byId('bomb-source')) byId('bomb-source').innerHTML=`<strong>Fuente:</strong> SecretarÃ­a de EnergÃ­a de Honduras (SEN) Â· Precios oficiales mÃ¡ximos de venta al pÃºblico Â· ${meta.location||'Tegucigalpa'} Â· PerÃ­odo: ${meta.coverage_start||BOMB[0][0]} â ${lastDate} (${BOMB.length} semanas). Datos vigentes: <code>data/latest.json</code>.`;
    if(byId('coverage-summary')) byId('coverage-summary').innerHTML=`ðï¸ <strong>Cobertura:</strong> ${meta.coverage_start||BOMB[0][0]} â ${lastDate} Â· ${BOMB.length} semanas Â· WTI hasta ${wtiCutoff}`;

    const wtiPeriod=document.querySelector('#wtiBox .chart-period');
    if(wtiPeriod) wtiPeriod.textContent=`USD/barril Â· Promedio mensual Â· Ene 2022 â ${wtiCutoff} (fecha de corte propia)`;
    const wtiSource=document.querySelector('#wtiBox .chart-source')||[...document.querySelectorAll('#wtiBox div')].find(el=>el.textContent.trim().startsWith('Fuente:'));
    if(wtiSource) wtiSource.innerHTML=`<strong>Fuente:</strong> EIA / FRED (DCOILWTICO) Â· Promedios mensuales enero 2022 â ${wtiCutoff}. Esta serie tiene una fecha de corte distinta a los precios semanales SEN.`;

    const asfStart=BOMB.findIndex(r=>r[0]==='26 Ene 2026');
    if(byId('gov-latest-hint')) byId('gov-latest-hint').textContent=`ð¡ Semana 0 = toma de posesiÃ³n. Ãltimo dato SEN: ${lastDate} Â· Gobierno Asfura: semana ${asfStart>=0?BOMB.length-1-asfStart:'â'}.`;

    const maxSup=Math.max(...BOMB.map(r=>r[2]));
    const maxRow=BOMB.find(r=>r[2]===maxSup);
    if(byId('stat-max-sup-label')) byId('stat-max-sup-label').textContent=`Superior Â· RÃCORD (${maxRow[0]})`;
    if(byId('stat-max-sup')) byId('stat-max-sup').textContent=`L ${maxSup.toFixed(2)}/gal`;
    if(byId('stat-max-sup-sub')) byId('stat-max-sup-sub').textContent=`MÃ¡ximo de ${BOMB.length} semanas observadas`;
    if(byId('stat-max-sup-tip')) byId('stat-max-sup-tip').innerHTML=`<strong>ðº RÃ©cord del perÃ­odo</strong>La gasolina superior alcanzÃ³ L ${maxSup.toFixed(2)}/gal el ${maxRow[0]}. Calculado desde la serie SEN.`;
    if(byId('stat-min-die')) byId('stat-min-die').textContent=`L ${Math.min(...BOMB.map(r=>r[4])).toFixed(2)}/gal`;
    if(byId('stat-current-sup')) byId('stat-current-sup').textContent=`L ${last[2].toFixed(2)}/gal`;
    if(byId('stat-current-change')) byId('stat-current-change').textContent=`${signed(weekly.sup)} semanal Â· ${lastDate}`;
    if(byId('ustat-current-tip')) byId('ustat-current-tip').innerHTML=`<strong>â½ Precio vigente Â· ${lastDate}</strong>Superior L ${last[2].toFixed(2)}, regular L ${last[3].toFixed(2)} y diÃ©sel L ${last[4].toFixed(2)} por galÃ³n. Fuente: SEN / data/latest.json.`;

    if(byId('timeline-latest-date')) byId('timeline-latest-date').textContent=`Enero â ${lastDate}`;
    if(byId('timeline-latest-title')) byId('timeline-latest-title').textContent=`2026: evoluciÃ³n de precios hasta la semana del ${lastDate}`;
    if(byId('timeline-latest-badges')) byId('timeline-latest-badges').innerHTML=`<span class="ev-badge ${weekly.sup>=0?'b-up':'b-dn'}">Superior ${signed(weekly.sup)}</span><span class="ev-badge ${weekly.die>=0?'b-up':'b-dn'}">DiÃ©sel ${signed(weekly.die)}</span>`;
    if(byId('timeline-latest-text')) byId('timeline-latest-text').innerHTML=`La Ãºltima estructura de precios corresponde al <strong>${lastDate}</strong>: superior <strong>L ${last[2].toFixed(2)}</strong>, regular <strong>L ${last[3].toFixed(2)}</strong> y diesel <strong>L ${last[4].toFixed(2)}</strong> por galÃ³n. Variaciones semanales: ${signed(weekly.sup)}, ${signed(weekly.reg)} y ${signed(weekly.die)}.`;
    if(byId('timeline-latest-pills')) byId('timeline-latest-pills').innerHTML=`<span class="dpill">Superior: <span>L ${last[2].toFixed(2)}</span></span><span class="dpill">Regular: <span>L ${last[3].toFixed(2)}</span></span><span class="dpill">Diesel: <span>L ${last[4].toFixed(2)}</span></span>`;

    const impactGrid=document.querySelector('#tab-impacto .grid3');
    if(impactGrid){
      let card=byId('impact-latest-card');
      if(!card){card=document.createElement('div');card.id='impact-latest-card';card.className='mc-highlight';impactGrid.prepend(card);}
      card.innerHTML=`<div class="mc-icon">ð</div><div class="mc-title">Impacto de los precios vigentes Â· ${lastDate}</div><div class="mc-text">Superior: <strong>L ${last[2].toFixed(2)}</strong> (${signed(weekly.sup)} semanal); Regular: <strong>L ${last[3].toFixed(2)}</strong> (${signed(weekly.reg)}); DiÃ©sel: <strong>L ${last[4].toFixed(2)}</strong> (${signed(weekly.die)}). En 2026 acumulan ${signed(annual.sup)}, ${signed(annual.reg)} y ${signed(annual.die)}. <em>Fuente: SEN / data/latest.json.</em></div>`;
    }

    if(byId('policy-current-intro')) byId('policy-current-intro').innerHTML=`Precios oficiales vigentes desde el <strong>${lastDate}</strong>, publicados por la SEN. ${meta.policy_note||''}`;
    const tbody=byId('policy-current-tbody');
    if(tbody){
      const fuels=[['â½ Gasolina Superior',2,'sup','#d4860b','Sin subsidio'],['â½ Gasolina Regular',3,'reg','#1a7f37',subsidy?`â ${subsidy}%`:'No especificado'],['ð DiÃ©sel',4,'die','#bc4c00',subsidy?`â ${subsidy}%`:'No especificado']];
      tbody.innerHTML=fuels.map((f,i)=>{const sps=last[f[1]]-SPS_DELTA[f[2]];return `<tr${i===1?' style="background:#fafbfc"':''}><td style="padding:8px 12px;border:1px solid #e1e4e8;font-weight:700;color:${f[3]}">${f[0]}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:right;font-weight:700">${last[f[1]].toFixed(2)}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:right">${signed(weekly[f[2]])}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:right">${signed(annual[f[2]])}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:right;font-weight:700">${sps.toFixed(2)}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:right">${signed(weekly[f[2]])}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:right">${signed(annual[f[2]])}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:center;font-weight:700">${f[4]}</td></tr>`;}).join('');
    }
    if(byId('policy-current-note')) byId('policy-current-note').textContent=`ð Vigencia desde ${lastDate} Â· Fuente: SEN Â· VariaciÃ³n acumulada desde ${yearStart[0]} Â· data/latest.json.`;

    if(byId('method-wti')) byId('method-wti').innerHTML=`Los precios WTI provienen de la <strong>EIA</strong> mediante FRED (DCOILWTICO). La serie disponible cubre enero 2022 â ${wtiCutoff}; su fecha de corte es independiente de los precios semanales SEN, actualizados hasta ${lastDate}.`;
    if(byId('method-processing')) byId('method-processing').innerHTML=`Se procesan <strong>${BOMB.length} semanas</strong> entre ${meta.coverage_start||BOMB[0][0]} y ${lastDate}. Los datos vigentes se leen de <code>data/latest.json</code>; grÃ¡ficos, tablas, variaciones y textos se recalculan al cargar la pÃ¡gina.`;
    if(byId('method-limitations')) byId('tmethod-limitations').innerHTML=`Los precios en bomba estÃ¡n actualizados hasta <strong>${lastDate}</strong> y proceden de estructuras oficiales SEN. WTI conserva su fecha de corte propia (${wtiCutoff}). Las estimaciones macroeconÃ³micas se identifican como proyecciones.`;

    document.querySelectorAll('.gc').forEach(card=>{
      const term=card.querySelector('.gc-term')?.textContent||'',def=card.querySelector('.gc-def');
      if(!def) return;
      if(term.startsWith('Gasolina Superior')) def.innerHTML=`Combustible de mayor octanaje. RÃ©cord: L ${maxSup.toFixed(2)}/gal. Precio vigente (${lastDate}): <strong>L ${last[2].toFixed(2)}/gal</strong>.`;
      if(term.startsWith('Gasolina Regular')) def.innerHTML=`Gasolina de uso extendido. Precio vigente (${lastDate}): <strong>L ${last[3].toFixed(2)}/gal</strong>${subsidy?` (estructura con apoyo temporal del ${subsidy}%)`:''}.`;
      if(term.startsWith('DiÃ©sel')) def.innerHTML=`combustible estratégico para transporte y producciÃ³n. Precio vigente (${lastDate}): <strong>L ${last[4].toFixed(2)}/gal</strong>.`;
    });
    const footer=byId('site-footer');
    if(footer) footer.innerHTML=footer.innerHTML.replace(/Actualizado:[^<]*/i,`Ãltimo dato SEN: ${lastDate} Â· Archivo: ${data.updated_at||'sin fecha'}`);
  }

  function refresh(data){
    filterBomb('all','by-all');
    bombChart.data.datasets[0].pointRadius=bombChart.data.labels.map(label=>BOMB_EVENTS[label]?5.5:0);
    bombChart.update();
    if(typeof refreshGovChart==='function') refreshGovChart();
    if(typeof buildAnxTable==='function') buildAnxTable(BOMB,window._anxYear||'all');
    else if(typeof buildTable==='function') buildTable(BOMB);
    updateText(data);
  }

  async function load(){
    prepareTargets();
    try{
      const response=await fetch(`./data/latest.json?t=${Date.now()}`,{cache:'no-store',headers:{Accept:'application/json'}});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      if(!Array.isArray(data.rows)||!data.rows.length) throw new Error('latest.json no contiene filas');
      mergeRows(data.rows);
      refresh(data);
    }catch(error){
      console.error('No se pudo cargar data/latest.json',error);
    }
  }

  document.addEventListener('DOMContentLoaded',load);
})();
// Sincroniza el tablero con la fuente oficial mantenida en data/latest.json.
// Este archivo se carga al final de index.html, después de los gráficos.
(function(){
  'use strict';

  const MONTHS={Ene:0,Feb:1,Mar:2,Abr:3,May:4,Jun:5,Jul:6,Ago:7,Sep:8,Oct:9,Nov:10,Dic:11};
  const byId=id=>document.getElementById(id);
  const dateValue=label=>{
    const p=String(label||'').split(' ');
    return p.length===3?new Date(Number(p[2]),MONTHS[p[1]]??0,Number(p[0])).getTime():0;
  };
  const signed=value=>Math.abs(value)<0.005?'— 0.00':`${value>0?'▲ +':'▼ −'}${Math.abs(value).toFixed(2)}`;

  // El archivo JSON es la única vía de actualización. Se anula el flujo manual
  // anterior antes de DOMContentLoaded y se retiran sus controles del documento.
  window.actualizarDatos=async()=>{};
  byId('btn-actualizar')?.remove();
  byId('update-status')?.remove();

  function prepareTargets(){
    const subtitle=document.querySelector('p.subtitle');
    if(subtitle) subtitle.id='site-period';

    const bombSource=document.querySelector('#bombBox .chart-source');
    if(bombSource) bombSource.id='bomb-source';

    const stats=document.querySelectorAll('#tab-graficos .stats .sc');
    const max=stats[1]?.children;
    if(max){max[0].id='stat-max-sup-label';max[1].id='stat-max-sup';max[2].id='stat-max-sup-sub';max[3].id='stat-max-sup-tip';}
    const min=stats[2]?.children;
    if(min) min[1].id='stat-min-die';
    const current=stats[3]?.children;
    if(current){current[1].id='stat-current-sup';current[2].id='stat-current-change';current[3].id='stat-current-tip';}

    const sourceBars=[...document.querySelectorAll('.source-bar')];
    const coverageBar=sourceBars.find(el=>el.textContent.includes('Cobertura:'));
    if(coverageBar){
      const coverage=[...coverageBar.children].find(el=>el.textContent.includes('Cobertura:'));
      if(coverage) coverage.id='coverage-summary';
    }
    const govHint=document.querySelector('#govBox .chint');
    if(govHint) govHint.id='gov-latest-hint';

    const latestCard=byId('ev9-detail')?.closest('.tl-card');
    if(latestCard){
      latestCard.querySelector('.tl-date').id='timeline-latest-date';
      latestCard.querySelector('.tl-card-title').id='timeline-latest-title';
      latestCard.querySelector('.tl-badges').id='timeline-latest-badges';
      latestCard.querySelector('.tl-detail p').id='timeline-latest-text';
      latestCard.querySelector('.tl-pills').id='timeline-latest-pills';
    }

    const policy=byId('asf-tabla3');
    if(policy){
      const body=policy.querySelector('.pol-body');
      if(body){
        const intro=body.querySelector(':scope > p');
        const tbody=body.querySelector('tbody');
        const note=body.querySelector('.tbl-scroll > p');
        if(intro) intro.id='policy-current-intro';
        if(tbody) tbody.id='policy-current-tbody';
        if(note) note.id='policy-current-note';
      }
    }

    document.querySelectorAll('.anx-step').forEach(step=>{
      const title=step.querySelector('.anx-step-title')?.textContent||'';
      const text=step.querySelector('.anx-step-text');
      if(!text) return;
      if(title.startsWith('Datos WTI')) text.id='method-wti';
      if(title.startsWith('Procesamiento')) text.id='method-processing';
      if(title.startsWith('Limitaciones')) text.id='method-limitations';
    });
    const footer=document.querySelector('.footer');
    if(footer) footer.id='site-footer';
  }

  function mergeRows(rows){
    const latestMax=Math.max(...rows.map(r=>dateValue(r.fecha)));
    const byDate=new Map(BOMB.filter(r=>dateValue(r[0])<=latestMax).map(r=>[r[0],r]));
    rows.forEach(row=>{
      const sup=Number(row.sup),reg=Number(row.reg),die=Number(row.die);
      if(row.fecha&&[sup,reg,die].every(Number.isFinite)){
        byDate.set(row.fecha,[row.fecha,String(row.anio||row.fecha.slice(-4)),sup,reg,die]);
      }
    });
    BOMB.splice(0,BOMB.length,...[...byDate.values()].sort((a,b)=>dateValue(a[0])-dateValue(b[0])));
  }

  function updateText(data){
    const meta=data.meta||{};
    const last=BOMB.at(-1),prev=BOMB.at(-2)||last;
    const yearStart=BOMB.find(r=>r[1]===last[1])||last;
    const lastDate=last[0],subsidy=Number(meta.regular_diesel_subsidy_pct)||0;
    const weekly={sup:last[2]-prev[2],reg:last[3]-prev[3],die:last[4]-prev[4]};
    const annual={sup:last[2]-yearStart[2],reg:last[3]-yearStart[3],die:last[4]-yearStart[4]};
    const wtiCutoff=meta.wti_last_month||'Abr 2026';
    window._dlLastDate=lastDate;
    window._latestMeta=meta;
    BOMB_EVENTS[lastDate]=`📍 Último dato SEN: Superior L ${last[2].toFixed(2)}`;

    if(byId('site-period')) byId('site-period').textContent=`Precio WTI (referencia internacional) · Gasolina Superior · Regular · Diésel · L/galón en bomba · Enero 2022 – ${lastDate}`;
    const chartPeriod=document.querySelector('#bombBox .chart-period');
    if(chartPeriod) chartPeriod.textContent=`Tegucigalpa (L/galón) · Período de observación: enero 2022 – ${lastDate}`;
    if(byId('bomb-source')) byId('bomb-source').innerHTML=`<strong>Fuente:</strong> Secretaría de Energía de Honduras (SEN) · Precios oficiales máximos de venta al público · ${meta.location||'Tegucigalpa'} · Período: ${meta.coverage_start||BOMB[0][0]} – ${lastDate} (${BOMB.length} semanas). Datos vigentes: <code>data/latest.json</code>.`;
    if(byId('coverage-summary')) byId('coverage-summary').innerHTML=`🗓️ <strong>Cobertura:</strong> ${meta.coverage_start||BOMB[0][0]} – ${lastDate} · ${BOMB.length} semanas · WTI hasta ${wtiCutoff}`;

    const wtiPeriod=document.querySelector('#wtiBox .chart-period');
    if(wtiPeriod) wtiPeriod.textContent=`USD/barril · Promedio mensual · Ene 2022 – ${wtiCutoff} (fecha de corte propia)`;
    const wtiSource=document.querySelector('#wtiBox .chart-source')||[...document.querySelectorAll('#wtiBox div')].find(el=>el.textContent.trim().startsWith('Fuente:'));
    if(wtiSource) wtiSource.innerHTML=`<strong>Fuente:</strong> EIA / FRED (DCOILWTICO) · Promedios mensuales enero 2022 – ${wtiCutoff}. Esta serie tiene una fecha de corte distinta a los precios semanales SEN.`;

    const asfStart=BOMB.findIndex(r=>r[0]==='26 Ene 2026');
    if(byId('gov-latest-hint')) byId('gov-latest-hint').textContent=`💡 Semana 0 = toma de posesión. Último dato SEN: ${lastDate} · Gobierno Asfura: semana ${asfStart>=0?BOMB.length-1-asfStart:'—'}.`;

    const maxSup=Math.max(...BOMB.map(r=>r[2]));
    const maxRow=BOMB.find(r=>r[2]===maxSup);
    if(byId('stat-max-sup-label')) byId('stat-max-sup-label').textContent=`Superior · RÉCORD (${maxRow[0]})`;
    if(byId('stat-max-sup')) byId('stat-max-sup').textContent=`L ${maxSup.toFixed(2)}/gal`;
    if(byId('stat-max-sup-sub')) byId('stat-max-sup-sub').textContent=`Máximo de ${BOMB.length} semanas observadas`;
    if(byId('stat-max-sup-tip')) byId('stat-max-sup-tip').innerHTML=`<strong>🔺 Récord del período</strong>La gasolina superior alcanzó L ${maxSup.toFixed(2)}/gal el ${maxRow[0]}. Calculado desde la serie SEN.`;
    if(byId('stat-min-die')) byId('stat-min-die').textContent=`L ${Math.min(...BOMB.map(r=>r[4])).toFixed(2)}/gal`;
    if(byId('stat-current-sup')) byId('stat-current-sup').textContent=`L ${last[2].toFixed(2)}/gal`;
    if(byId('stat-current-change')) byId('stat-current-change').textContent=`${signed(weekly.sup)} semanal · ${lastDate}`;
    if(byId('ustat-current-tip')) byId('ustat-current-tip').innerHTML=`<strong>⛽ Precio vigente · ${lastDate}</strong>Superior L ${last[2].toFixed(2)}, regular L ${last[3].toFixed(2)} y diésel L ${last[4].toFixed(2)} por galón. Fuente: SEN / data/latest.json.`;

    if(byId('timeline-latest-date')) byId('timeline-latest-date').textContent=`Enero – ${lastDate}`;
    if(byId('timeline-latest-title')) byId('timeline-latest-title').textContent=`2026: evolución de precios hasta la semana del ${lastDate}`;
    if(byId('timeline-latest-badges')) byId('timeline-latest-badges').innerHTML=`<span class="ev-badge ${weekly.sup>=0?'b-up':'b-dn'}">Superior ${signed(weekly.sup)}</span><span class="ev-badge ${weekly.die>=0?'b-up':'b-dn'}">Diésel ${signed(weekly.die)}</span>`;
    if(byId('timeline-latest-text')) byId('timeline-latest-text').innerHTML=`La última estructura de precios corresponde al <strong>${lastDate}</strong>: superior <strong>L ${last[2].toFixed(2)}</strong>, regular <strong>L ${last[3].toFixed(2)}</strong> y diesel <strong>L ${last[4].toFixed(2)}</strong> por galón. Variaciones semanales: ${signed(weekly.sup)}, ${signed(weekly.reg)} y ${signed(weekly.die)}.`;
    if(byId('timeline-latest-pills')) byId('timeline-latest-pills').innerHTML=`<span class="dpill">Superior: <span>L ${last[2].toFixed(2)}</span></span><span class="dpill">Regular: <span>L ${last[3].toFixed(2)}</span></span><span class="dpill">Diesel: <span>L ${last[4].toFixed(2)}</span></span>`;

    const impactGrid=document.querySelector('#tab-impacto .grid3');
    if(impactGrid){
      let card=byId('impact-latest-card');
      if(!card){card=document.createElement('div');card.id='impact-latest-card';card.className='mc-highlight';impactGrid.prepend(card);}
      card.innerHTML=`<div class="mc-icon">📊</div><div class="mc-title">Impacto de los precios vigentes · ${lastDate}</div><div class="mc-text">Superior: <strong>L ${last[2].toFixed(2)}</strong> (${signed(weekly.sup)} semanal); Regular: <strong>L ${last[3].toFixed(2)}</strong> (${signed(weekly.reg)}); Diésel: <strong>L ${last[4].toFixed(2)}</strong> (${signed(weekly.die)}). En 2026 acumulan ${signed(annual.sup)}, ${signed(annual.reg)} y ${signed(annual.die)}. <em>Fuente: SEN / data/latest.json.</em></div>`;
    }

    if(byId('policy-current-intro')) byId('policy-current-intro').innerHTML=`Precios oficiales vigentes desde el <strong>${lastDate}</strong>, publicados por la SEN. ${meta.policy_note||''}`;
    const tbody=byId('policy-current-tbody');
    if(tbody){
      const fuels=[['⛽ Gasolina Superior',2,'sup','#d4860b','Sin subsidio'],['⛽ Gasolina Regular',3,'reg','#1a7f37',subsidy?`✓ ${subsidy}%`:'No especificado'],['🚛 Diésel',4,'die','#bc4c00',subsidy?`✓ ${subsidy}%`:'No especificado']];
      tbody.innerHTML=fuels.map((f,i)=>{const sps=last[f[1]]-SPS_DELTA[f[2]];return `<tr${i===1?' style="background:#fafbfc"':''}><td style="padding:8px 12px;border:1px solid #e1e4e8;font-weight:700;color:${f[3]}">${f[0]}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:right;font-weight:700">${last[f[1]].toFixed(2)}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:right">${signed(weekly[f[2]])}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:right">${signed(annual[f[2]])}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:right;font-weight:700">${sps.toFixed(2)}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:right">${signed(weekly[f[2]])}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:right">${signed(annual[f[2]])}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:center;font-weight:700">${f[4]}</td></tr>`;}).join('');
    }
    if(byId('policy-current-note')) byId('policy-current-note').textContent=`📅 Vigencia desde ${lastDate} · Fuente: SEN · Variación acumulada desde ${yearStart[0]} · data/latest.json.`;

    if(byId('method-wti')) byId('method-wti').innerHTML=`Los precios WTI provienen de la <strong>EIA</strong> mediante FRED (DCOILWTICO). La serie disponible cubre enero 2022 – ${wtiCutoff}; su fecha de corte es independiente de los precios semanales SEN, actualizados hasta ${lastDate}.`;
    if(byId('method-processing')) byId('method-processing').innerHTML=`Se procesan <strong>${BOMB.length} semanas</strong> entre ${meta.coverage_start||BOMB[0][0]} y ${lastDate}. Los datos vigentes se leen de <code>data/latest.json</code>; gráficos, tablas, variaciones y textos se recalculan al cargar la página.`;
    if(byId('method-limitations')) byId('tmethod-limitations').innerHTML=`Los precios en bomba están actualizados hasta <strong>${lastDate}</strong> y proceden de estructuras oficiales SEN. WTI conserva su fecha de corte propia (${wtiCutoff}). Las estimaciones macroeconómicas se identifican como proyecciones.`;

    document.querySelectorAll('.gc').forEach(card=>{
      const term=card.querySelector('.gc-term')?.textContent||'',def=card.querySelector('.gc-def');
      if(!def) return;
      if(term.startsWith('Gasolina Superior')) def.innerHTML=`Combustible de mayor octanaje. Récord: L ${maxSup.toFixed(2)}/gal. Precio vigente (${lastDate}): <strong>L ${last[2].toFixed(2)}/gal</strong>.`;
      if(term.startsWith('Gasolina Regular')) def.innerHTML=`Gasolina de uso extendido. Precio vigente (${lastDate}): <strong>L ${last[3].toFixed(2)}/gal</strong>${subsidy?` (estructura con apoyo temporal del ${subsidy}%)`:''}.`;
      if(term.startsWith('Diésel')) def.innerHTML=`combustible estrat�gico para transporte y producción. Precio vigente (${lastDate}): <strong>L ${last[4].toFixed(2)}/gal</strong>.`;
    });
    const footer=byId('site-footer');
    if(footer) footer.innerHTML=footer.innerHTML.replace(/Actualizado:[^<]*/i,`Último dato SEN: ${lastDate} · Archivo: ${data.updated_at||'sin fecha'}`);
  }

  function refresh(data){
    filterBomb('all','by-all');
    bombChart.data.datasets[0].pointRadius=bombChart.data.labels.map(label=>BOMB_EVENTS[label]?5.5:0);
    bombChart.update();
    if(typeof refreshGovChart==='function') refreshGovChart();
    if(typeof buildAnxTable==='function') buildAnxTable(BOMB,window._anxYear||'all');
    else if(typeof buildTable==='function') buildTable(BOMB);
    updateText(data);
  }

  async function load(){
    prepareTargets();
    try{
      const response=await fetch(`./data/latest.json?t=${Date.now()}`,{cache:'no-store',headers:{Accept:'application/json'}});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      if(!Array.isArray(data.rows)||!data.rows.length) throw new Error('latest.json no contiene filas');
      mergeRows(data.rows);
      refresh(data);
    }catch(error){
      console.error('No se pudo cargar data/latest.json',error);
    }
  }

  document.addEventListener('DOMContentLoaded',load);
})();
// Sincroniza el tablero con la fuente oficial mantenida en data/latest.json.
// Este archivo se carga al final de index.html, después de los gráficos.
(function(){
  'use strict';

  const MONTHS={Ene:0,Feb:1,Mar:2,Abr:3,May:4,Jun:5,Jul:6,Ago:7,Sep:8,Oct:9,Nov:10,Dic:11};
  const byId=id=>document.getElementById(id);
  const dateValue=label=>{
    const p=String(label||'').split(' ');
    return p.length===3?new Date(Number(p[2]),MONTHS[p[1]]??0,Number(p[0])).getTime():0;
  };
  const signed=value=>Math.abs(value)<0.005?'— 0.00':`${value>0?'▲ +':'▼ −'}${Math.abs(value).toFixed(2)}`;

  // El archivo JSON es la única vía de actualización. Se anula el flujo manual
  // anterior antes de DOMContentLoaded y se retiran sus controles del documento.
  window.actualizarDatos=async()=>{};
  byId('btn-actualizar')?.remove();
  byId('update-status')?.remove();

  function prepareTargets(){
    const subtitle=document.querySelector('p.subtitle');
    if(subtitle) subtitle.id='site-period';

    const bombSource=document.querySelector('#bombBox .chart-source');
    if(bombSource) bombSource.id='bomb-source';

    const stats=document.querySelectorAll('#tab-graficos .stats .sc');
    const max=stats[1]?.children;
    if(max){max[0].id='stat-max-sup-label';max[1].id='stat-max-sup';max[2].id='stat-max-sup-sub';max[3].id='stat-max-sup-tip';}
    const min=stats[2]?.children;
    if(min) min[1].id='stat-min-die';
    const current=stats[3]?.children;
    if(current){current[1].id='stat-current-sup';current[2].id='stat-current-change';current[3].id='stat-current-tip';}

    const sourceBars=[...document.querySelectorAll('.source-bar')];
    const coverageBar=sourceBars.find(el=>el.textContent.includes('Cobertura:'));
    if(coverageBar){
      const coverage=[...coverageBar.children].find(el=>el.textContent.includes('Cobertura:'));
      if(coverage) coverage.id='coverage-summary';
    }
    const govHint=document.querySelector('#govBox .chint');
    if(govHint) govHint.id='gov-latest-hint';

    const latestCard=byId('ev9-detail')?.closest('.tl-card');
    if(latestCard){
      latestCard.querySelector('.tl-date').id='timeline-latest-date';
      latestCard.querySelector('.tl-card-title').id='timeline-latest-title';
      latestCard.querySelector('.tl-badges').id='timeline-latest-badges';
      latestCard.querySelector('.tl-detail p').id='timeline-latest-text';
      latestCard.querySelector('.tl-pills').id='timeline-latest-pills';
    }

    const policy=byId('asf-tabla3');
    if(policy){
      const body=policy.querySelector('.pol-body');
      if(body){
        const intro=body.querySelector(':scope > p');
        const tbody=body.querySelector('tbody');
        const note=body.querySelector('.tbl-scroll > p');
        if(intro) intro.id='policy-current-intro';
        if(tbody) tbody.id='policy-current-tbody';
        if(note) note.id='policy-current-note';
      }
    }

    document.querySelectorAll('.anx-step').forEach(step=>{
      const title=step.querySelector('.anx-step-title')?.textContent||'';
      const text=step.querySelector('.anx-step-text');
      if(!text) return;
      if(title.startsWith('Datos WTI')) text.id='method-wti';
      if(title.startsWith('Procesamiento')) text.id='method-processing';
      if(title.startsWith('Limitaciones')) text.id='method-limitations';
    });
    const footer=document.querySelector('.footer');
    if(footer) footer.id='site-footer';
  }

  function mergeRows(rows){
    const latestMax=Math.max(...rows.map(r=>dateValue(r.fecha)));
    const byDate=new Map(BOMB.filter(r=>dateValue(r[0])<=latestMax).map(r=>[r[0],r]));
    rows.forEach(row=>{
      const sup=Number(row.sup),reg=Number(row.reg),die=Number(row.die);
      if(row.fecha&&[sup,reg,die].every(Number.isFinite)){
        byDate.set(row.fecha,[row.fecha,String(row.anio||row.fecha.slice(-4)),sup,reg,die]);
      }
    });
    BOMB.splice(0,BOMB.length,...[...byDate.values()].sort((a,b)=>dateValue(a[0])-dateValue(b[0])));
  }

  function updateText(data){
    const meta=data.meta||{};
    const last=BOMB.at(-1),prev=BOMB.at(-2)||last;
    const yearStart=BOMB.find(r=>r[1]===last[1])||last;
    const lastDate=last[0],subsidy=Number(meta.regular_diesel_subsidy_pct)||0;
    const weekly={sup:last[2]-prev[2],reg:last[3]-prev[3],die:last[4]-prev[4]};
    const annual={sup:last[2]-yearStart[2],reg:last[3]-yearStart[3],die:last[4]-yearStart[4]};
    const wtiCutoff=meta.wti_last_month||'Abr 2026';
    window._dlLastDate=lastDate;
    window._latestMeta=meta;
    BOMB_EVENTS[lastDate]=`📍 Último dato SEN: Superior L ${last[2].toFixed(2)}`;

    if(byId('site-period')) byId('site-period').textContent=`Precio WTI (referencia internacional) · Gasolina Superior · Regular · Diésel · L/galón en bomba · Enero 2022 – ${lastDate}`;
    const chartPeriod=document.querySelector('#bombBox .chart-period');
    if(chartPeriod) chartPeriod.textContent=`Tegucigalpa (L/galón) · Período de observación: enero 2022 – ${lastDate}`;
    if(byId('bomb-source')) byId('bomb-source').innerHTML=`<strong>Fuente:</strong> Secretaría de Energía de Honduras (SEN) · Precios oficiales máximos de venta al público · ${meta.location||'Tegucigalpa'} · Período: ${meta.coverage_start||BOMB[0][0]} – ${lastDate} (${BOMB.length} semanas). Datos vigentes: <code>data/latest.json</code>.`;
    if(byId('coverage-summary')) byId('coverage-summary').innerHTML=`🗓️ <strong>Cobertura:</strong> ${meta.coverage_start||BOMB[0][0]} – ${lastDate} · ${BOMB.length} semanas · WTI hasta ${wtiCutoff}`;

    const wtiPeriod=document.querySelector('#wtiBox .chart-period');
    if(wtiPeriod) wtiPeriod.textContent=`USD/barril · Promedio mensual · Ene 2022 – ${wtiCutoff} (fecha de corte propia)`;
    const wtiSource=document.querySelector('#wtiBox .chart-source')||[...document.querySelectorAll('#wtiBox div')].find(el=>el.textContent.trim().startsWith('Fuente:'));
    if(wtiSource) wtiSource.innerHTML=`<strong>Fuente:</strong> EIA / FRED (DCOILWTICO) · Promedios mensuales enero 2022 – ${wtiCutoff}. Esta serie tiene una fecha de corte distinta a los precios semanales SEN.`;

    const asfStart=BOMB.findIndex(r=>r[0]==='26 Ene 2026');
    if(byId('gov-latest-hint')) byId('gov-latest-hint').textContent=`💡 Semana 0 = toma de posesión. Último dato SEN: ${lastDate} · Gobierno Asfura: semana ${asfStart>=0?BOMB.length-1-asfStart:'—'}.`;

    const maxSup=Math.max(...BOMB.map(r=>r[2]));
    const maxRow=BOMB.find(r=>r[2]===maxSup);
    if(byId('stat-max-sup-label')) byId('stat-max-sup-label').textContent=`Superior · RÉCORD (${maxRow[0]})`;
    if(byId('stat-max-sup')) byId('stat-max-sup').textContent=`L ${maxSup.toFixed(2)}/gal`;
    if(byId('stat-max-sup-sub')) byId('stat-max-sup-sub').textContent=`Máximo de ${BOMB.length} semanas observadas`;
    if(byId('stat-max-sup-tip')) byId('stat-max-sup-tip').innerHTML=`<strong>🔺 Récord del período</strong>La gasolina superior alcanzó L ${maxSup.toFixed(2)}/gal el ${maxRow[0]}. Calculado desde la serie SEN.`;
    if(byId('stat-min-die')) byId('stat-min-die').textContent=`L ${Math.min(...BOMB.map(r=>r[4])).toFixed(2)}/gal`;
    if(byId('stat-current-sup')) byId('stat-current-sup').textContent=`L ${last[2].toFixed(2)}/gal`;
    if(byId('stat-current-change')) byId('stat-current-change').textContent=`${signed(weekly.sup)} semanal · ${lastDate}`;
    if(byId('stat-current-tip')) byId('stat-current-tip').innerHTML=`<strong>⛽ Precio vigente · ${lastDate}</strong>Superior L ${last[2].toFixed(2)}, regular L ${last[3].toFixed(2)} y diésel L ${last[4].toFixed(2)} por galón. Fuente: SEN / data/latest.json.`;

    if(byId('timeline-latest-date')) byId('timeline-latest-date').textContent=`Enero – ${lastDate}`;
    if(byId('timeline-latest-title')) byId('timeline-latest-title').textContent=`2026: evolución de precios hasta la semana del ${lastDate}`;
    if(byId('timeline-latest-badges')) byId('timeline-latest-badges').innerHTML=`<span class="ev-badge ${weekly.sup>=0?'b-up':'b-dn'}">Superior ${signed(weekly.sup)}</span><span class="ev-badge ${weekly.die>=0?'b-up':'b-dn'}">Diésel ${signed(weekly.die)}</span>`;
    if(byId('timeline-latest-text')) byId('timeline-latest-text').innerHTML=`La última estructura de precios corresponde al <strong>${lastDate}</strong>: superior <strong>L ${last[2].toFixed(2)}</strong>, regular <strong>L ${last[3].toFixed(2)}</strong> y diesel <strong>L ${last[4].toFixed(2)}</strong> por galón. Variaciones semanales: ${signed(weekly.sup)}, ${signed(weekly.reg)} y ${signed(weekly.die)}.`;
    if(byId('timeline-latest-pills')) byId('timeline-latest-pills').innerHTML=`<span class="dpill">Superior: <span>L ${last[2].toFixed(2)}</span></span><span class="dpill">Regular: <span>L ${last[3].toFixed(2)}</span></span><span class="dpill">Diesel: <span>L ${last[4].toFixed(2)}</span></span>`;

    const impactGrid=document.querySelector('#tab-impacto .grid3');
    if(impactGrid){
      let card=byId('impact-latest-card');
      if(!card){card=document.createElement('div');card.id='impact-latest-card';card.className='mc-highlight';impactGrid.prepend(card);}
      card.innerHTML=`<div class="mc-icon">📊</div><div class="mc-title">Impacto de los precios vigentes · ${lastDate}</div><div class="mc-text">Superior: <strong>L ${last[2].toFixed(2)}</strong> (${signed(weekly.sup)} semanal); Regular: <strong>L ${last[3].toFixed(2)}</strong> (${signed(weekly.reg)}); Diésel: <strong>L ${last[4].toFixed(2)}</strong> (${signed(weekly.die)}). En 2026 acumulan ${signed(annual.sup)}, ${signed(annual.reg)} y ${signed(annual.die)}. <em>Fuente: SEN / data/latest.json.</em></div>`;
    }

    if(byId('policy-current-intro')) byId('policy-current-intro').innerHTML=`Precios oficiales vigentes desde el <strong>${lastDate}</strong>, publicados por la SEN. ${meta.policy_note||''}`;
    const tbody=byId('policy-current-tbody');
    if(tbody){
      const fuels=[['⛽ Gasolina Superior',2,'sup','#d4860b','Sin subsidio'],['⛽ Gasolina Regular',3,'reg','#1a7f37',subsidy?`✓ ${subsidy}%`:'No especificado'],['🚛 Diésel',4,'die','#bc4c00',subsidy?`✓ ${subsidy}%`:'No especificado']];
      tbody.innerHTML=fuels.map((f,i)=>{const sps=last[f[1]]-SPS_DELTA[f[2]];return `<tr${i===1?' style="background:#fafbfc"':''}><td style="padding:8px 12px;border:1px solid #e1e4e8;font-weight:700;color:${f[3]}">${f[0]}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:right;font-weight:700">${last[f[1]].toFixed(2)}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:right">${signed(weekly[f[2]])}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:right">${signed(annual[f[2]])}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:right;font-weight:700">${sps.toFixed(2)}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:right">${signed(weekly[f[2]])}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:right">${signed(annual[f[2]])}</td><td style="padding:8px 12px;border:1px solid #e1e4e8;text-align:center;font-weight:700">${f[4]}</td></tr>`;}).join('');
    }
    if(byId('policy-current-note')) byId('policy-current-note').textContent=`📅 Vigencia desde ${lastDate} · Fuente: SEN · Variación acumulada desde ${yearStart[0]} · data/latest.json.`;

    if(byId('method-wti')) byId('method-wti').innerHTML=`Los precios WTI provienen de la <strong>EIA</strong> mediante FRED (DCOILWTICO). La serie disponible cubre enero 2022 – ${wtiCutoff}; su fecha de corte es independiente de los precios semanales SEN, actualizados hasta ${lastDate}.`;
    if(byId('method-processing')) byId('method-processing').innerHTML=`Se procesan <strong>${BOMB.length} semanas</strong> entre ${meta.coverage_start||BOMB[0][0]} y ${lastDate}. Los datos vigentes se leen de <code>data/latest.json</code>; gráficos, tablas, variaciones y textos se recalculan al cargar la página.`;
    if(byId('method-limitations')) byId('method-limitations').innerHTML=`Los precios en bomba están actualizados hasta <strong>${lastDate}</strong> y proceden de estructuras oficiales SEN. WTI conserva su fecha de corte propia (${wtiCutoff}). Las estimaciones macroeconómicas se identifican como proyecciones.`;

    document.querySelectorAll('.gc').forEach(card=>{
      const term=card.querySelector('.gc-term')?.textContent||'',def=card.querySelector('.gc-def');
      if(!def) return;
      if(term.startsWith('Gasolina Superior')) def.innerHTML=`Combustible de mayor octanaje. Récord: L ${maxSup.toFixed(2)}/gal. Precio vigente (${lastDate}): <strong>L ${last[2].toFixed(2)}/gal</strong>.`;
      if(term.startsWith('Gasolina Regular')) def.innerHTML=`Gasolina de uso extendido. Precio vigente (${lastDate}): <strong>L ${last[3].toFixed(2)}/gal</strong>${subsidy?` (estructura con apoyo temporal del ${subsidy}%)`:''}.`;
      if(term.startsWith('Diésel')) def.innerHTML=`combustible estrat�gico para transporte y producción. Precio vigente (${lastDate}): <strong>L ${last[4].toFixed(2)}/gal</strong>.`;
    });
    const footer=byId('site-footer');
    if(footer) footer.innerHTML=footer.innerHTML.replace(/Actualizado:[^<]*/i,`Último dato SEN: ${lastDate} · Archivo: ${data.updated_at||'sin fecha'}`);
  }

  function refresh(data){
    filterBomb('all','by-all');
    bombChart.data.datasets[0].pointRadius=bombChart.data.labels.map(label=>BOMB_EVENTS[label]?5.5:0);
    bombChart.update();
    if(typeof refreshGovChart==='function') refreshGovChart();
    if(typeof buildAnxTable==='function') buildAnxTable(BOMB,window._anxYear||'all');
    else if(typeof buildTable==='function') buildTable(BOMB);
    updateText(data);
  }

  async function load(){
    prepareTargets();
    try{
      const response=await fetch(`./data/latest.json?t=${Date.now()}`,{cache:'no-store',headers:{Accept:'application/json'}});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      if(!Array.isArray(data.rows)||!data.rows.length) throw new Error('latest.json no contiene filas');
      mergeRows(data.rows);
      refresh(data);
    }catch(error){
      console.error('No se pudo cargar data/latest.json',error);
    }
  }

  document.addEventListener('DOMContentLoaded',load);
})();
