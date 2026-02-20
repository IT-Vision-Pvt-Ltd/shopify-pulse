import { useState, useEffect, Suspense, lazy } from 'react';

const Chart = typeof window !== 'undefined' ? lazy(() => import('react-apexcharts')) : (() => null) as any;

function CC(p: any) {
  const [c, sc] = useState(false);
  useEffect(() => sc(true), []);
  if (!c) return <div style={{ height: p.height || 250 }} />;
  return <Suspense fallback={<div style={{ height: p.height || 250 }} />}><Chart {...p} /></Suspense>;
}

export default function CustomersPage() {
  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <div><h1>Customer Intelligence</h1><p className="sp-subtitle">Understand your customers, retention, and lifetime value.</p></div>
        <div className="sp-date-tabs"><button className="sp-tab-btn active">30 Days</button><button className="sp-tab-btn">90 Days</button><button className="sp-tab-btn">12 Months</button></div>
      </div>

      <div className="sp-kpi-row">
        {[{l:'TOTAL CUSTOMERS',v:'8,247',c:'+340',cl:'#10b981',d:[7800,7900,8000,8050,8100,8150,8200,8247]},{l:'NEW THIS MONTH',v:'412',c:'+18%',cl:'#10b981',d:[280,310,340,360,380,390,400,412]},{l:'REPEAT RATE',v:'34.2%',c:'+2.1%',cl:'#10b981',d:[30,31,31,32,32,33,34,34]},{l:'AVG LTV',v:'$284',c:'+8%',cl:'#10b981',d:[250,260,265,270,275,278,280,284]},{l:'CHURN RISK',v:'237',c:'+12',cl:'#ef4444',d:[200,210,215,220,225,228,232,237]},{l:'AVG LTV:CAC',v:'3.2x',c:'+0.3',cl:'#10b981',d:[2.5,2.6,2.7,2.8,2.9,3.0,3.1,3.2]}].map((k,i)=>(
          <div key={i} className="sp-kpi-card">
            <span className="sp-kpi-label">{k.l}</span>
            <div className="sp-kpi-value">{k.v}</div>
            <CC type="area" height={40} width={100} series={[{data:k.d}]} options={{chart:{sparkline:{enabled:true},toolbar:{show:false}},stroke:{width:2,curve:'smooth'},colors:[k.cl],fill:{type:'gradient',gradient:{opacityFrom:0.4,opacityTo:0}},tooltip:{enabled:false},xaxis:{labels:{show:false}},yaxis:{show:false}}} />
            <span className="sp-kpi-change" style={{color:k.cl}}>{k.c}</span>
          </div>
        ))}
      </div>

      <div className="sp-card">
        <h3>Monthly Cohort Retention Grid</h3>
        <div className="sp-heatmap-grid">
          <div className="sp-hm-header"><span>Cohort</span>{['Mo 0','Mo 1','Mo 2','Mo 3','Mo 4','Mo 5','Mo 6','Mo 7','Mo 8','Mo 9','Mo 10','Mo 11','Mo 12'].map(m=><span key={m}>{m}</span>)}</div>
          {[
            {c:'Jan 24',d:[100,72,58,48,42,38,35,32,30,28,27,26,25]},
            {c:'Feb 24',d:[100,68,55,45,40,36,33,30,28,26,25,24,0]},
            {c:'Mar 24',d:[100,70,56,46,41,37,34,31,29,27,26,0,0]},
            {c:'Apr 24',d:[100,65,52,43,38,34,31,28,26,25,0,0,0]},
            {c:'May 24',d:[100,71,57,47,42,38,35,32,30,0,0,0,0]},
            {c:'Jun 24',d:[100,67,54,44,39,35,32,29,0,0,0,0,0]},
            {c:'Jul 24',d:[100,73,59,49,43,39,36,0,0,0,0,0,0]},
            {c:'Aug 24',d:[100,69,55,45,40,36,0,0,0,0,0,0,0]},
          ].map((r,i)=>(
            <div key={i} className="sp-hm-row"><span className="sp-hm-label">{r.c}</span>{r.d.map((v,j)=>(
              <span key={j} className="sp-hm-cell" style={{background:v===0?'#f9fafb':v>=60?'#059669':v>=40?'#10b981':v>=25?'#fbbf24':'#fb923c',color:v>35?'#fff':'#333',fontSize:'11px'}}>{v>0?v+'%':''}</span>
            ))}</div>
          ))}
        </div>
      </div>

      <div className="sp-grid sp-grid-2">
        <div className="sp-card">
          <h3>Cohort Revenue Retention</h3>
          <CC type="line" height={280} series={[{name:'Jan 24',data:[100,72,58,48,42,38,35,32,30,28,27,26,25]},{name:'Apr 24',data:[100,65,52,43,38,34,31,28,26,25]},{name:'Jul 24',data:[100,73,59,49,43,39,36]}]} options={{chart:{toolbar:{show:false}},stroke:{width:2,curve:'smooth'},colors:['#10b981','#1a73e8','#f59e0b'],xaxis:{categories:['Mo0','Mo1','Mo2','Mo3','Mo4','Mo5','Mo6','Mo7','Mo8','Mo9','Mo10','Mo11','Mo12']},yaxis:{min:0,max:100,labels:{formatter:(v:number)=>v+'%'}},legend:{position:'top'}}} />
        </div>
        <div className="sp-card">
          <h3>LTV Distribution</h3>
          <CC type="bar" height={280} series={[{name:'Customers',data:[120,280,420,380,310,250,180,140,95,65,42,28]}]} options={{chart:{toolbar:{show:false}},plotOptions:{bar:{columnWidth:'70%'}},colors:['#8b5cf6'],xaxis:{categories:['$0-25','$25-50','$50-100','$100-150','$150-200','$200-300','$300-400','$400-500','$500-750','$750-1K','$1K-2K','$2K+']},yaxis:{title:{text:'# Customers'}}}} />
        </div>
      </div>

      <div className="sp-grid sp-grid-3">
        <div className="sp-card">
          <h3>LTV by Channel</h3>
          <CC type="bar" height={250} series={[{name:'Current LTV',data:[320,280,240,195,160]},{name:'Previous LTV',data:[290,260,220,180,145]}]} options={{chart:{toolbar:{show:false}},plotOptions:{bar:{columnWidth:'50%'}},colors:['#10b981','#94a3b8'],xaxis:{categories:['Organic','Social','Paid','Direct','Email']},yaxis:{labels:{formatter:(v:number)=>'$'+v}},legend:{position:'top'}}} />
        </div>
        <div className="sp-card">
          <h3>LTV by First Product</h3>
          <CC type="bar" height={250} series={[{name:'LTV',data:[420,380,320,280,240,195]}]} options={{chart:{toolbar:{show:false}},plotOptions:{bar:{horizontal:true,barHeight:'60%'}},colors:['#1a73e8'],xaxis:{labels:{formatter:(v:number)=>'$'+v}},yaxis:{categories:['Headphones','Watch','Shoes','Tee','Stand','Bottle']}}} />
        </div>
        <div className="sp-card">
          <h3>LTV:CAC Ratio</h3>
          <CC type="radialBar" height={250} series={[80]} options={{chart:{toolbar:{show:false}},plotOptions:{radialBar:{hollow:{size:'60%'},dataLabels:{name:{show:true,fontSize:'14px'},value:{show:true,fontSize:'28px',formatter:()=>'3.2x'}}}},colors:['#10b981'],labels:['LTV:CAC']}} />
          <div className="sp-stat-item" style={{textAlign:'center',marginTop:8}}><div className="sp-stat-label">Target: 3.0x</div><div className="sp-stat-change" style={{color:'#10b981'}}>Above Target</div></div>
        </div>
      </div>

      <div className="sp-grid sp-grid-3">
        <div className="sp-card" style={{gridColumn:'span 2'}}>
          <h3>RFM Segmentation Treemap</h3>
          <CC type="treemap" height={300} series={[{data:[{x:'Champions (820)',y:820},{x:'Loyal Customers (1240)',y:1240},{x:'Promising (680)',y:680},{x:'At-Risk (520)',y:520},{x:'New Customers (412)',y:412},{x:'Need Attention (380)',y:380},{x:'Hibernating (290)',y:290},{x:'About to Sleep (210)',y:210},{x:'Lost (180)',y:180}]}]} options={{chart:{toolbar:{show:false}},colors:['#10b981','#059669','#34d399','#f59e0b','#1a73e8','#fbbf24','#fb923c','#ef4444','#94a3b8'],plotOptions:{treemap:{distributed:true}},legend:{show:false}}} />
        </div>
        <div className="sp-card">
          <div className="sp-ai-banner" style={{margin:0,borderRadius:8}}>
            <div className="sp-ai-banner-icon">AI</div>
            <div className="sp-ai-banner-content">
              <h3>RFM Insight</h3>
              <p>237 customers moved from Loyal to At-Risk this month. Top reason: No purchase in 45+ days.</p>
              <button className="sp-btn sp-btn-light" style={{marginTop:8}}>Take Action</button>
            </div>
          </div>
          <div className="sp-card" style={{marginTop:16}}>
            <h3>Customer Lifecycle Funnel</h3>
            <div className="sp-funnel">
              {[{l:'Prospects',v:12400,p:100},{l:'First Purchase',v:4120,p:33},{l:'Repeat',v:2840,p:23},{l:'Loyal',v:1240,p:10},{l:'Champion',v:820,p:7}].map((s,i)=>(
                <div key={i} className="sp-funnel-step"><div className="sp-funnel-bar" style={{width:s.p+'%',background:'linear-gradient(90deg, #10b981, #1a73e8)'}}><span>{s.l}</span><span>{s.v.toLocaleString()}</span></div></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="sp-grid sp-grid-3">
        <div className="sp-card">
          <h3>Repeat Purchase Rate</h3>
          <CC type="line" height={250} series={[{name:'Repeat Rate',data:[28,29,30,31,30,32,33,31,33,34,33,34]}]} options={{chart:{toolbar:{show:false}},stroke:{width:3,curve:'smooth'},colors:['#10b981'],xaxis:{categories:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']},yaxis:{min:25,max:38,labels:{formatter:(v:number)=>v+'%'}}}} />
        </div>
        <div className="sp-card">
          <h3>Time Between Purchases</h3>
          <CC type="bar" height={250} series={[{name:'Customers',data:[180,420,380,310,250,195,140,95,65,42]}]} options={{chart:{toolbar:{show:false}},plotOptions:{bar:{columnWidth:'70%'}},colors:['#1a73e8'],xaxis:{categories:['0-7d','7-14d','14-30d','30-45d','45-60d','60-90d','90-120d','120-180d','180-365d','365d+']},yaxis:{title:{text:'# Customers'}}}} />
        </div>
        <div className="sp-card">
          <h3>Revenue Pareto 80/20</h3>
          <CC type="line" height={250} series={[{name:'Cumulative Revenue %',data:[15,28,38,47,55,62,68,73,78,82,86,89,92,94,96,97,98,99,99,100]},{name:'Revenue',type:'bar',data:[15,13,10,9,8,7,6,5,5,4,4,3,3,2,2,1,1,1,0.5,0.5]}]} options={{chart:{toolbar:{show:false}},stroke:{width:[3,0],curve:'smooth'},colors:['#ef4444','#94a3b8'],xaxis:{categories:Array.from({length:20},(_,i)=>`${(i+1)*5}%`)},yaxis:[{title:{text:'Cumulative %'},max:100},{opposite:true,title:{text:'Revenue %'}}],legend:{position:'top'}}} />
        </div>
      </div>


      <div className="sp-grid sp-grid-2">
        <div className="sp-card">
          <h3>Churn Prediction Scatter</h3>
          <CC type="scatter" height={280} series={[{name:'Low Risk',data:[[10,15],[15,20],[20,25],[25,18],[12,22],[18,12]]},{name:'Medium Risk',data:[[45,45],[50,55],[55,48],[60,52],[48,58]]},{name:'High Risk',data:[[80,75],[85,82],[90,88],[95,92],[88,85],[92,90]]}]} options={{chart:{toolbar:{show:false}},colors:['#10b981','#f59e0b','#ef4444'],xaxis:{title:{text:'Days Since Last Order'},min:0,max:100},yaxis:{title:{text:'Churn Probability (%)'},min:0,max:100},markers:{size:8},legend:{position:'top'}}} />
        </div>
        <div className="sp-card">
          <h3>Next Purchase Timeline</h3>
          <CC type="area" height={280} series={[{name:'Probability',data:[5,12,28,42,55,48,35,22,15,10,6,3]}]} options={{chart:{toolbar:{show:false}},stroke:{width:3,curve:'smooth'},colors:['#8b5cf6'],fill:{type:'gradient',gradient:{opacityFrom:0.5,opacityTo:0.05}},xaxis:{categories:['1d','3d','7d','14d','21d','30d','45d','60d','90d','120d','180d','365d'],title:{text:'Days Until Next Purchase'}},yaxis:{title:{text:'Probability (%)'},max:60}}} />
        </div>
      </div>

      <div className="sp-footer-actions">
        <button className="sp-btn sp-btn-primary">Export Report</button>
        <button className="sp-btn sp-btn-outline">Schedule</button>
      </div>
    </div>
  );
}
