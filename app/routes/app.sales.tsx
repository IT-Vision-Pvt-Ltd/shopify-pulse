import { useState, useEffect, Suspense, lazy } from 'react';

const Chart = typeof window !== 'undefined' ? lazy(() => import('react-apexcharts')) : (() => null) as any;

function CC(p: any) {
  const [c, sc] = useState(false);
  useEffect(() => sc(true), []);
  if (!c) return <div style={{ height: p.height || 250 }} />;
  return <Suspense fallback={<div style={{ height: p.height || 250 }} />}><Chart {...p} /></Suspense>;
}

export default function SalesRevenuePage() {
  const kpis = [
    { label: 'TOTAL REVENUE', value: '$142.3K', change: '+12%', color: '#10b981', data: [30,40,35,50,49,60,70,65,80] },
    { label: 'TOTAL ORDERS', value: '1,847', change: '+8%', color: '#10b981', data: [20,25,30,28,35,40,38,42,45] },
    { label: 'AVG ORDER VALUE', value: '$77.02', change: '+3.5%', color: '#10b981', data: [70,72,71,74,73,76,75,77,77] },
    { label: 'GROSS PROFIT', value: '$52.8K', change: '+15%', color: '#10b981', data: [35,38,40,42,45,48,50,52,53] },
    { label: 'REFUND RATE', value: '2.4%', change: '+0.3%', color: '#ef4444', data: [2,2.1,2.2,2.1,2.3,2.2,2.4,2.3,2.4] },
    { label: 'NET REVENUE', value: '$138.9K', change: '+11%', color: '#10b981', data: [100,105,110,115,120,125,130,135,139] },
    { label: 'UNITS SOLD', value: '3,284', change: '+8%', color: '#10b981', data: [250,280,300,290,320,310,340,330,350] },
    { label: 'AVG MARGIN', value: '37.1%', change: '+2.1%', color: '#10b981', data: [34,35,35,36,36,37,36,37,37] },
  ];

  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <div><h1>Sales & Revenue Analytics</h1><p className="sp-subtitle">Deep-dive into performance, trends, and revenue streams.</p></div>
        <div className="sp-date-tabs"><button className="sp-tab-btn active">30 Days</button><button className="sp-tab-btn">7 Days</button><button className="sp-tab-btn">Today</button><button className="sp-tab-btn">Custom</button></div>
      </div>

      <div className="sp-ai-banner">
        <div className="sp-ai-banner-icon">AI</div>
        <div className="sp-ai-banner-content">
          <h3>AI Sales Intelligence</h3>
          <p>Revenue up 12% WoW driven by SAVE20 promo. Thursday peak hours (2-4PM) show 34% higher AOV. Consider extending flash sale into next week.</p>
        </div>
        <button className="sp-btn sp-btn-light">View Details</button>
      </div>

      <div className="sp-kpi-row">
        {kpis.map((k, i) => (
          <div key={i} className="sp-kpi-card">
            <span className="sp-kpi-label">{k.label}</span>
            <div className="sp-kpi-value">{k.value}</div>
            <CC type="area" height={40} width={100} series={[{data:k.data}]} options={{chart:{sparkline:{enabled:true},toolbar:{show:false}},stroke:{width:2,curve:'smooth'},colors:[k.color],fill:{type:'gradient',gradient:{opacityFrom:0.4,opacityTo:0}},tooltip:{enabled:false},xaxis:{labels:{show:false}},yaxis:{show:false}}} />
            <span className="sp-kpi-change" style={{color:k.color}}>{k.change}</span>
          </div>
        ))}
      </div>

      <div className="sp-grid sp-grid-3">
        <div className="sp-card">
          <h3>Revenue by Sales Channel</h3>
          <CC type="donut" height={280} series={[40,25,20,15]} options={{labels:['Online','Retail','Partner','Direct'],colors:['#1a73e8','#10b981','#f59e0b','#ef4444'],chart:{toolbar:{show:false}},plotOptions:{pie:{donut:{size:'60%',labels:{show:true,total:{show:true,label:'Total',formatter:()=>'$142.3K'}}}}},legend:{position:'bottom'}}} />
        </div>
        <div className="sp-card">
          <h3>Revenue by Traffic Source</h3>
          <CC type="donut" height={280} series={[40,20,25,10,5]} options={{labels:['Organic Search','Social','Paid Search','Direct','Other'],colors:['#10b981','#f59e0b','#1a73e8','#374151','#ef4444'],chart:{toolbar:{show:false}},plotOptions:{pie:{donut:{size:'60%',labels:{show:true,total:{show:true,label:'Total',formatter:()=>'$142.3K'}}}}},legend:{position:'bottom'}}} />
        </div>
        <div className="sp-card">
          <h3>Revenue by Device Type</h3>
          <CC type="treemap" height={280} series={[{data:[{x:'iOS',y:45},{x:'Android',y:30},{x:'Windows',y:15},{x:'macOS',y:7},{x:'Other',y:3}]}]} options={{colors:['#10b981','#1a73e8','#8b5cf6','#f59e0b','#ef4444'],chart:{toolbar:{show:false}},plotOptions:{treemap:{distributed:true}},legend:{show:false}}} />
        </div>
      </div>

      <div className="sp-card">
        <div className="sp-card-header"><h3>Net Revenue Waterfall Chart</h3><div><button className="sp-btn-sm">Filter by Date</button><button className="sp-btn-sm">Export Data</button></div></div>
        <CC type="bar" height={300} series={[{name:'Revenue',data:[{x:'Gross',y:[0,142300]},{x:'Discounts',y:[142300,127300]},{x:'Returns',y:[127300,119800]},{x:'Fees',y:[119800,115300]},{x:'Tax',y:[115300,112800]},{x:'COGS',y:[112800,98200]},{x:'Net Profit',y:[0,118700]}]}]} options={{chart:{toolbar:{show:false}},plotOptions:{bar:{columnWidth:'60%',colors:{ranges:[{from:-100000,to:0,color:'#ef4444'},{from:0,to:200000,color:'#1a73e8'}]}}},colors:['#1a73e8'],xaxis:{labels:{style:{fontSize:'12px'}}},yaxis:{labels:{formatter:(v:number)=>'$'+Math.round(v/1000)+'K'}},annotations:{yaxis:[{y:118700,borderColor:'#10b981',label:{text:'Net: $118.7K',style:{background:'#10b981',color:'#fff'}}}]}}} />
        <div className="sp-ai-insight-bar">AI: Discounts & Refunds account for 14.5% reduction in Gross Revenue. Consider optimizing.</div>
      </div>

      <div className="sp-grid sp-grid-2">
        <div className="sp-card">
          <h3>AOV Trend Line</h3>
          <CC type="line" height={250} series={[{name:'AOV',data:[72,73,74,71,75,76,78,80,79,81,77,82,83,85,84,77]},{name:'Avg',data:Array(16).fill(77)}]} options={{chart:{toolbar:{show:false}},stroke:{width:[2,2],dashArray:[0,5],curve:'smooth'},colors:['#8b5cf6','#ef4444'],xaxis:{categories:['D1','D4','D7','D10','D13','D16','D19','D22','D25','D28','D1','D4','D7','D10','D13','D16']},yaxis:{min:68,labels:{formatter:(v:number)=>'$'+v}},legend:{position:'top'}}} />
        </div>
        <div className="sp-card">
          <h3>Orders by Day-of-Week</h3>
          <CC type="bar" height={250} series={[{name:'Last Week',data:[120,140,160,150,180,200,130]},{name:'Current Week',data:[140,160,180,170,210,230,150]},{name:'Target',data:[150,150,150,150,150,150,150]}]} options={{chart:{toolbar:{show:false}},plotOptions:{bar:{columnWidth:'60%'}},colors:['#94a3b8','#10b981','#f59e0b'],xaxis:{categories:['Mon','Tue','Wed','Thu','Fri','Sat','Sun']},legend:{position:'top'}}} />
        </div>
      </div>

      <div className="sp-grid sp-grid-2">
        <div className="sp-card">
          <h3>Revenue by Geography</h3>
          <CC type="bar" height={250} series={[{name:'Revenue',data:[42300,28100,22400,18200,12500,8800,5400,4600]}]} options={{chart:{toolbar:{show:false}},plotOptions:{bar:{horizontal:false,columnWidth:'50%'}},colors:['#1a73e8'],xaxis:{categories:['US','UK','CA','AU','DE','FR','JP','IN']},yaxis:{labels:{formatter:(v:number)=>'$'+(v/1000).toFixed(1)+'K'}}}} />
        </div>
        <div className="sp-card">
          <h3>Top 10 Cities</h3>
          <CC type="bar" height={250} series={[{name:'Revenue',data:[18200,14300,12100,9800,8400,7200,6100,5400,4800,4200]}]} options={{chart:{toolbar:{show:false}},plotOptions:{bar:{horizontal:true,barHeight:'60%'}},colors:['#10b981'],xaxis:{labels:{formatter:(v:number)=>'$'+(v/1000).toFixed(1)+'K'}},yaxis:{categories:['NYC','LA','London','Toronto','Sydney','Berlin','Paris','Tokyo','Mumbai','SF']}}} />
        </div>
      </div>

      <div className="sp-grid sp-grid-2">
        <div className="sp-card">
          <h3>Payment Methods</h3>
          <CC type="donut" height={260} series={[45,28,15,8,4]} options={{labels:['Credit Card','PayPal','Apple Pay','Google Pay','Other'],colors:['#1a73e8','#f59e0b','#374151','#10b981','#94a3b8'],chart:{toolbar:{show:false}},plotOptions:{pie:{donut:{size:'60%',labels:{show:true,total:{show:true,label:'Total',formatter:()=>'$142.3K'}}}}},legend:{position:'bottom'}}} />
        </div>
        <div className="sp-card">
          <h3>Currency Breakdown</h3>
          <CC type="pie" height={260} series={[65,18,10,7]} options={{labels:['USD','EUR','GBP','CAD'],colors:['#1a73e8','#10b981','#f59e0b','#8b5cf6'],chart:{toolbar:{show:false}},legend:{position:'bottom'}}} />
        </div>
      </div>

      <div className="sp-grid sp-grid-2">
        <div className="sp-card">
          <h3>New vs Returning Revenue</h3>
          <CC type="area" height={250} series={[{name:'New',data:[3200,3500,4100,3800,4200,4500,5000,4800,5200,5500,5800,6100]},{name:'Returning',data:[4800,5200,5500,5100,5800,6200,6500,6800,7200,7500,7800,8100]}]} options={{chart:{toolbar:{show:false},stacked:true},stroke:{curve:'smooth',width:2},colors:['#1a73e8','#10b981'],xaxis:{categories:['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10','W11','W12']},yaxis:{labels:{formatter:(v:number)=>'$'+(v/1000).toFixed(1)+'K'}},legend:{position:'top'},fill:{type:'gradient',gradient:{opacityFrom:0.5,opacityTo:0.1}}}} />
        </div>
        <div className="sp-card">
          <h3>Refund/Return Rate Trend</h3>
          <CC type="line" height={250} series={[{name:'Refund Rate %',type:'line',data:[2.1,2.3,2.0,2.4,2.2,2.5,2.3,2.4,2.1,2.6,2.3,2.4]},{name:'Returns',type:'bar',data:[120,140,110,150,130,160,140,150,120,170,140,150]}]} options={{chart:{toolbar:{show:false}},stroke:{width:[3,0],curve:'smooth'},colors:['#ef4444','#94a3b8'],xaxis:{categories:['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10','W11','W12']},yaxis:[{title:{text:'Rate %'},min:0,max:4},{opposite:true,title:{text:'Returns'},min:0}],legend:{position:'top'}}} />
        </div>
      </div>

      <h2 className="sp-section-title">Revenue Trend & Anomaly Timeline</h2>
      <div className="sp-grid sp-grid-2">
        <div className="sp-card">
          <h3>Cart Abandonment Funnel</h3>
          <div className="sp-funnel">
            {[{l:'Sessions',v:8420,p:100},{l:'Add to Cart',v:3200,p:38},{l:'Checkout Started',v:2100,p:25},{l:'Payment Info',v:1680,p:20},{l:'Orders Placed',v:1420,p:17}].map((s,i)=>(
              <div key={i} className="sp-funnel-step"><div className="sp-funnel-bar" style={{width:s.p+'%',background:`linear-gradient(90deg, #1a73e8 ${s.p}%, #e5e7eb ${s.p}%)`}}><span>{s.l}</span><span>{s.v.toLocaleString()} ({s.p}%)</span></div></div>
            ))}
          </div>
        </div>
        <div className="sp-card">
          <h3>Revenue per Session & Conversion Economics</h3>
          <div className="sp-stats-grid">
            {[{l:'Revenue/Session',v:'$16.90',c:'+3.2%'},{l:'Revenue/Visitor',v:'$11.20',c:'+2.1%'},{l:'Conv Rate',v:'16.9%',c:'+1.2%'},{l:'Cart Conv',v:'44.4%',c:'+2.8%'},{l:'Checkout Conv',v:'67.6%',c:'+1.5%'},{l:'Bounce Rate',v:'35.2%',c:'-2.1%'}].map((s,i)=>(
              <div key={i} className="sp-stat-item"><div className="sp-stat-label">{s.l}</div><div className="sp-stat-value">{s.v}</div><div className="sp-stat-change" style={{color:s.c.includes('-')?'#10b981':'#10b981'}}>{s.c}</div></div>
            ))}
          </div>
        </div>
      </div>

      <div className="sp-grid sp-grid-2">
        <div className="sp-card">
          <h3>Transaction Fees & Platform Cost Breakdown</h3>
          <table className="sp-table"><thead><tr><th>Fee Type</th><th>Amount</th><th>% of Rev</th><th>Trend</th></tr></thead><tbody>
            {[['Shopify Fee','$2,845','2.0%','stable'],['Payment Processing','$4,123','2.9%','up'],['App Fees','$890','0.6%','down'],['Shipping Labels','$3,200','2.2%','up'],['Tax Collected','$8,415','5.9%','up']].map((r,i)=>(
              <tr key={i}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td><span className={'sp-badge sp-badge-'+r[3]}>{r[3]}</span></td></tr>
            ))}
          </tbody></table>
        </div>
        <div className="sp-card">
          <h3>Discount Effectiveness Analysis</h3>
          <CC type="bar" height={250} series={[{name:'Revenue Impact',data:[12400,8200,6100,4800,3200]},{name:'Orders',data:[340,220,180,120,85]}]} options={{chart:{toolbar:{show:false}},plotOptions:{bar:{columnWidth:'50%'}},colors:['#10b981','#1a73e8'],xaxis:{categories:['SAVE20','FLASH15','WELCOME10','LOYALTY5','BUNDLE30']},yaxis:[{title:{text:'Revenue ($)'},labels:{formatter:(v:number)=>'$'+(v/1000).toFixed(1)+'K'}},{opposite:true,title:{text:'Orders'}}],legend:{position:'top'}}} />
        </div>
      </div>

      <div className="sp-card">
        <h3>Sales by Product Category</h3>
        <CC type="treemap" height={280} series={[{data:[{x:'Clothing',y:42300},{x:'Electronics',y:28100},{x:'Home',y:22400},{x:'Beauty',y:18200},{x:'Sports',y:12500},{x:'Books',y:8800},{x:'Toys',y:5400},{x:'Food',y:4600}]}]} options={{chart:{toolbar:{show:false}},colors:['#10b981','#1a73e8','#f59e0b','#8b5cf6','#ef4444','#374151','#06b6d4','#ec4899'],plotOptions:{treemap:{distributed:true}},legend:{show:false}}} />
      </div>

      <div className="sp-grid sp-grid-3">
        <div className="sp-card">
          <h3>Revenue Cohort Analysis</h3>
          <div className="sp-heatmap-grid">
            <div className="sp-hm-header"><span></span>{['Mo0','Mo1','Mo2','Mo3','Mo4','Mo5'].map(m=><span key={m}>{m}</span>)}</div>
            {[{c:'Jan 25',d:[100,68,52,41,35,30]},{c:'Feb 25',d:[100,72,55,43,37,0]},{c:'Mar 25',d:[100,65,48,38,0,0]},{c:'Apr 25',d:[100,70,51,0,0,0]},{c:'May 25',d:[100,67,0,0,0,0]}].map((r,i)=>(
              <div key={i} className="sp-hm-row"><span className="sp-hm-label">{r.c}</span>{r.d.map((v,j)=>(<span key={j} className="sp-hm-cell" style={{background:v===0?'#f3f4f6':v>60?'#10b981':v>40?'#34d399':v>20?'#fbbf24':'#fb923c',color:v>50?'#fff':'#333'}}>{v>0?v+'%':''}</span>))}</div>
            ))}
          </div>
        </div>
        <div className="sp-card">
          <h3>Tax Breakdown by Region</h3>
          <CC type="bar" height={250} series={[{name:'Tax Collected',data:[3200,2100,1800,800,515]},{name:'Tax Remitted',data:[2800,1900,1600,700,450]}]} options={{chart:{toolbar:{show:false},stacked:false},plotOptions:{bar:{columnWidth:'50%'}},colors:['#f59e0b','#10b981'],xaxis:{categories:['US','UK','CA','AU','Other']},yaxis:{labels:{formatter:(v:number)=>'$'+v}},legend:{position:'top'}}} />
        </div>
        <div className="sp-card">
          <h3>Cancelled & Failed Orders</h3>
          <div className="sp-stats-grid">
            {[{l:'Cancelled',v:'47',c:'2.5%'},{l:'Failed',v:'23',c:'1.2%'},{l:'Fraud Flagged',v:'8',c:'0.4%'},{l:'Lost Revenue',v:'$6,840',c:'+12%'}].map((s,i)=>(
              <div key={i} className="sp-stat-item"><div className="sp-stat-label">{s.l}</div><div className="sp-stat-value">{s.v}</div><div className="sp-stat-change" style={{color:'#ef4444'}}>{s.c}</div></div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="sp-section-title">Shipping, Hourly Revenue & Velocity</h2>
      <div className="sp-grid sp-grid-3">
        <div className="sp-card">
          <h3>Shipping Revenue vs Cost</h3>
          <CC type="bar" height={250} series={[{name:'Revenue',data:[8200,6400,4800,3200]},{name:'Cost',data:[5800,4200,3400,2400]}]} options={{chart:{toolbar:{show:false}},plotOptions:{bar:{columnWidth:'50%'}},colors:['#10b981','#ef4444'],xaxis:{categories:['USPS','FedEx','UPS','DHL']},yaxis:{labels:{formatter:(v:number)=>'$'+(v/1000).toFixed(1)+'K'}},legend:{position:'top'}}} />
        </div>
        <div className="sp-card">
          <h3>Hourly & Daily Revenue Heatmap</h3>
          <CC type="heatmap" height={250} series={['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>({name:d,data:Array.from({length:12},(_,i)=>({x:`${i+8}:00`,y:Math.floor(Math.random()*5000)+1000}))}))} options={{chart:{toolbar:{show:false}},colors:['#10b981'],plotOptions:{heatmap:{shadeIntensity:0.5,colorScale:{ranges:[{from:0,to:2000,color:'#d1fae5',name:'Low'},{from:2001,to:3500,color:'#34d399',name:'Med'},{from:3501,to:6000,color:'#10b981',name:'High'}]}}},xaxis:{labels:{style:{fontSize:'10px'}}}}} />
        </div>
        <div className="sp-card">
          <h3>Sales Velocity Tracker</h3>
          <CC type="line" height={250} series={[{name:'Units/Day',data:[85,92,78,95,88,102,98,110,95,105,112,118]},{name:'Target',data:Array(12).fill(100)}]} options={{chart:{toolbar:{show:false}},stroke:{width:[3,2],dashArray:[0,5],curve:'smooth'},colors:['#8b5cf6','#94a3b8'],xaxis:{categories:['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10','W11','W12']},legend:{position:'top'}}} />
        </div>
      </div>

      <div className="sp-footer-actions">
        <button className="sp-btn sp-btn-primary">Export Full Report</button>
        <button className="sp-btn sp-btn-outline">Schedule Email Report</button>
      </div>
    </div>
  );
}
