import { useState, useEffect, Suspense, lazy } from 'react';

const Chart = typeof window !== 'undefined' ? lazy(() => import('react-apexcharts')) : (() => null) as any;

function CC(p: any) {
  const [c, sc] = useState(false);
  useEffect(() => sc(true), []);
  if (!c) return <div style={{ height: p.height || 250 }} />;
  return <Suspense fallback={<div style={{ height: p.height || 250 }} />}><Chart {...p} /></Suspense>;
}

export default function ProductsPage() {
  const [tab, setTab] = useState('performance');
  const tabs = ['performance','margins','inventory','returns'];

  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <div><h1>Product Intelligence</h1><p className="sp-subtitle">Deep-dive into product performance, margins, inventory and returns.</p></div>
      </div>

      <div className="sp-tabs">
        {tabs.map(t => (
          <button key={t} className={`sp-tab-btn ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'performance' && (
        <>
          <div className="sp-ai-banner">
            <div className="sp-ai-banner-icon">AI</div>
            <div className="sp-ai-banner-content">
              <h3>Product Shift Alert</h3>
              <p>Wireless Headphones Pro moved from Question Mark to Star. Dead stock alert: 12 SKUs have zero sales in 60+ days.</p>
            </div>
          </div>

          <div className="sp-card">
            <h3>BCG Product Matrix</h3>
            <CC type="scatter" height={350} series={[{name:'Stars',data:[[75,22],[85,18],[90,25]]},{name:'Cash Cows',data:[[80,5],[70,3],[65,4]]},{name:'Question Marks',data:[[20,20],[30,18],[25,22]]},{name:'Dogs',data:[[15,2],[10,3],[20,1]]}]} options={{chart:{toolbar:{show:false}},colors:['#10b981','#1a73e8','#f59e0b','#ef4444'],xaxis:{title:{text:'Revenue ($K)'},min:0,max:100},yaxis:{title:{text:'Growth Rate (%)'},min:-5,max:30},markers:{size:12},annotations:{yaxis:[{y:10,borderColor:'#94a3b8',label:{text:'Growth Threshold'}}],xaxis:[{x:50,borderColor:'#94a3b8',label:{text:'Revenue Threshold'}}]},legend:{position:'top'}}} />
          </div>

          <div className="sp-card">
            <h3>Top 20 Products by Revenue</h3>
            <CC type="bar" height={400} series={[{name:'Revenue',data:[18200,15400,12800,11200,9800,8600,7400,6800,6200,5800,5200,4800,4400,4000,3600,3200,2800,2400,2000,1800]}]} options={{chart:{toolbar:{show:false}},plotOptions:{bar:{horizontal:true,barHeight:'70%'}},colors:['#10b981'],xaxis:{labels:{formatter:(v:number)=>'$'+(v/1000).toFixed(1)+'K'}},yaxis:{categories:['Wireless Headphones Pro','Organic Cotton Tee','Smart Watch Elite','Running Shoes Ultra','Laptop Stand Pro','Bamboo Water Bottle','LED Desk Lamp','Yoga Mat Premium','Phone Case Ultra','Bluetooth Speaker','Fitness Tracker','Sunglasses Classic','Backpack Travel','Coffee Maker Pro','Kitchen Scale','Notebook Set','USB Cable Pack','Mouse Pad XL','Water Filter','Pen Set Gold']}}} />
          </div>

          <div className="sp-card">
            <h3>Dead Stock / Bottom 20</h3>
            <CC type="bar" height={300} series={[{name:'Days on Hand',data:[180,165,150,142,130,125,118,112,105,98]}]} options={{chart:{toolbar:{show:false}},plotOptions:{bar:{horizontal:true,barHeight:'60%',colors:{ranges:[{from:120,to:200,color:'#ef4444'},{from:80,to:119,color:'#f59e0b'},{from:0,to:79,color:'#10b981'}]}}},colors:['#ef4444'],xaxis:{title:{text:'Days on Hand'}},yaxis:{categories:['Widget A','Gadget B','Tool C','Item D','Part E','Thing F','Piece G','Unit H','Object I','Device J']}}} />
          </div>

          <div className="sp-card">
            <h3>Product Velocity Table</h3>
            <table className="sp-table"><thead><tr><th>Product</th><th>Units/Day</th><th>Stock</th><th>Days Left</th><th>Status</th></tr></thead><tbody>
              {[['Wireless Headphones',8.2,180,22,'ok'],['Cotton Tee',6.5,45,7,'warning'],['Smart Watch',5.1,12,2,'critical'],['Running Shoes',4.8,210,44,'ok'],['Laptop Stand',3.2,85,27,'ok']].map((r:any,i)=>(
                <tr key={i}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td><span className={`sp-badge sp-badge-${r[4]}`}>{r[4]}</span></td></tr>
              ))}
            </tbody></table>
          </div>

          <div className="sp-grid sp-grid-2">
            <div className="sp-card">
              <h3>Variant Heatmap (Size x Color)</h3>
              <div className="sp-heatmap-grid">
                <div className="sp-hm-header"><span></span>{['Black','White','Red','Blue','Green'].map(c=><span key={c}>{c}</span>)}</div>
                {['XS','S','M','L','XL'].map((sz,i)=>(
                  <div key={i} className="sp-hm-row"><span className="sp-hm-label">{sz}</span>
                    {[12,28,45,38,15,8,35,62,48,22,5,18,52,42,18,15,30,55,40,20,3,12,28,22,8].slice(i*5,i*5+5).map((v,j)=>(
                      <span key={j} className="sp-hm-cell" style={{background:v>40?'#10b981':v>20?'#34d399':v>10?'#fbbf24':'#ef4444',color:v>30?'#fff':'#333'}}>{v}</span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="sp-card">
              <h3>Product Margin Comparison</h3>
              <CC type="bar" height={250} series={[{name:'Margin %',data:[42,38,35,32,28,25,22,18]}]} options={{chart:{toolbar:{show:false}},plotOptions:{bar:{horizontal:true,barHeight:'60%'}},colors:['#10b981'],xaxis:{title:{text:'Margin %'},max:50},yaxis:{categories:['Headphones','Tee','Watch','Shoes','Stand','Bottle','Lamp','Mat']},annotations:{xaxis:[{x:30,borderColor:'#ef4444',label:{text:'Store Avg: 30%'}}]}}} />
            </div>
          </div>

          <div className="sp-grid sp-grid-3">
            <div className="sp-card">
              <h3>Collection Performance</h3>
              <CC type="bar" height={250} series={[{name:'Revenue',data:[28400,22100,18600,14200,9800]},{name:'Units',data:[420,380,310,250,180]}]} options={{chart:{toolbar:{show:false}},plotOptions:{bar:{columnWidth:'50%'}},colors:['#1a73e8','#10b981'],xaxis:{categories:['Summer','Winter','Sport','Casual','Formal']},legend:{position:'top'}}} />
            </div>
            <div className="sp-card">
              <h3>Product Return Rate</h3>
              <CC type="scatter" height={250} series={[{name:'Products',data:[[8200,2.1],[12400,3.5],[5800,1.8],[18200,4.2],[9600,2.8],[15400,5.1],[7200,1.5],[11000,3.2]]}]} options={{chart:{toolbar:{show:false}},colors:['#8b5cf6'],xaxis:{title:{text:'Revenue ($)'},labels:{formatter:(v:number)=>'$'+(v/1000)+'K'}},yaxis:{title:{text:'Return Rate (%)'}},markers:{size:8}}} />
            </div>
            <div className="sp-card">
              <h3>Price Elasticity</h3>
              <div className="sp-stats-grid">
                {[{l:'Elastic Products',v:'23',c:'Price Sensitive'},{l:'Inelastic',v:'18',c:'Price Stable'},{l:'Avg Elasticity',v:'-1.4',c:'Moderate'},{l:'Optimal Price Range',v:'$45-$85',c:'Sweet Spot'}].map((s,i)=>(
                  <div key={i} className="sp-stat-item"><div className="sp-stat-label">{s.l}</div><div className="sp-stat-value">{s.v}</div><div className="sp-stat-change">{s.c}</div></div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'margins' && (
        <>
          <div className="sp-kpi-row">
            {[{l:'GROSS MARGIN $',v:'$52.8K',c:'+15%',cl:'#10b981'},{l:'GROSS MARGIN %',v:'37.1%',c:'+2.1%',cl:'#10b981'},{l:'DISCOUNT % OF REV',v:'8.2%',c:'+1.1%',cl:'#ef4444'},{l:'REFUND % OF REV',v:'2.4%',c:'+0.3%',cl:'#ef4444'},{l:'CONTRIBUTION MARGIN',v:'$48.2K',c:'+12%',cl:'#10b981'},{l:'NEG MARGIN SKUs',v:'14',c:'+3',cl:'#ef4444'}].map((k,i)=>(
              <div key={i} className="sp-kpi-card"><span className="sp-kpi-label">{k.l}</span><div className="sp-kpi-value">{k.v}</div><span className="sp-kpi-change" style={{color:k.cl}}>{k.c}</span></div>
            ))}
          </div>

          <div className="sp-card">
            <h3>Margin Waterfall</h3>
            <CC type="bar" height={300} series={[{name:'Margin',data:[{x:'Gross Revenue',y:[0,142300]},{x:'COGS',y:[89500,142300]},{x:'Discounts',y:[78200,89500]},{x:'Returns',y:[72400,78200]},{x:'Shipping',y:[66800,72400]},{x:'Net Margin',y:[0,52800]}]}]} options={{chart:{toolbar:{show:false}},colors:['#10b981'],plotOptions:{bar:{columnWidth:'55%'}},xaxis:{labels:{style:{fontSize:'12px'}}},yaxis:{labels:{formatter:(v:number)=>'$'+(v/1000).toFixed(0)+'K'}}}} />
          </div>

          <div className="sp-card">
            <h3>Margin % Trend (Weekly)</h3>
            <CC type="line" height={250} series={[{name:'Margin %',data:[34,35,33,36,35,37,38,36,37,38,37,37]},{name:'Store Avg',data:Array(12).fill(36)}]} options={{chart:{toolbar:{show:false}},stroke:{width:[3,2],dashArray:[0,5],curve:'smooth'},colors:['#8b5cf6','#ef4444'],xaxis:{categories:['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10','W11','W12']},yaxis:{min:30,max:42,labels:{formatter:(v:number)=>v+'%'}},legend:{position:'top'}}} />
          </div>

          <div className="sp-grid sp-grid-2">
            <div className="sp-card">
              <h3>Margin by Vendor (Ranked)</h3>
              <CC type="bar" height={250} series={[{name:'Margin %',data:[45,42,38,35,32,28,25,22]}]} options={{chart:{toolbar:{show:false}},plotOptions:{bar:{horizontal:true,barHeight:'60%'}},colors:['#1a73e8'],xaxis:{max:50},yaxis:{categories:['VendorA','VendorB','VendorC','VendorD','VendorE','VendorF','VendorG','VendorH']}}} />
            </div>
            <div className="sp-card">
              <h3>Discount vs Margin Tradeoff</h3>
              <CC type="scatter" height={250} series={[{name:'Sweet Spot',data:[[5,42],[8,38],[10,35],[12,32]]},{name:'Danger Zone',data:[[18,22],[22,18],[25,15],[30,12]]}]} options={{chart:{toolbar:{show:false}},colors:['#10b981','#ef4444'],xaxis:{title:{text:'Discount %'},max:35},yaxis:{title:{text:'Margin %'},max:50},markers:{size:10},legend:{position:'top'}}} />
            </div>
          </div>

          <div className="sp-card">
            <h3>SKU-Level Margin & Leak Table</h3>
            <table className="sp-table"><thead><tr><th>SKU</th><th>Product</th><th>Revenue</th><th>COGS</th><th>Margin %</th><th>Disc %</th><th>Action</th></tr></thead><tbody>
              {[['SKU001','Headphones','$18.2K','$10.5K','42%','5%','ok'],['SKU002','Cotton Tee','$15.4K','$9.8K','36%','12%','review'],['SKU003','Smart Watch','$12.8K','$9.6K','25%','20%','stop-disc'],['SKU004','Running Shoes','$11.2K','$7.8K','30%','8%','ok'],['SKU005','Widget X','$2.1K','$2.4K','-14%','25%','remove']].map((r,i)=>(
                <tr key={i}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td style={{color:String(r[4]).includes('-')?'#ef4444':'#10b981'}}>{r[4]}</td><td>{r[5]}</td><td><span className={`sp-badge sp-badge-${r[6]}`}>{r[6]==='stop-disc'?'Stop Discount':r[6]==='remove'?'Remove':r[6]==='review'?'Review':'OK'}</span></td></tr>
              ))}
            </tbody></table>
          </div>
        </>
      )}

      {tab === 'inventory' && (
        <>
          <div className="sp-kpi-row">
            {[{l:'TOTAL SKUs',v:'342',c:'',cl:'#374151'},{l:'IN STOCK',v:'285',c:'83%',cl:'#10b981'},{l:'LOW STOCK',v:'38',c:'11%',cl:'#f59e0b'},{l:'OUT OF STOCK',v:'19',c:'6%',cl:'#ef4444'},{l:'INVENTORY VALUE',v:'$284.5K',c:'',cl:'#1a73e8'},{l:'AVG WEEKS COVER',v:'6.2',c:'+0.8',cl:'#10b981'}].map((k,i)=>(
              <div key={i} className="sp-kpi-card"><span className="sp-kpi-label">{k.l}</span><div className="sp-kpi-value">{k.v}</div><span className="sp-kpi-change" style={{color:k.cl}}>{k.c}</span></div>
            ))}
          </div>

          <div className="sp-card">
            <h3>Stockout Risk Heatmap (SKU x Weeks)</h3>
            <div className="sp-heatmap-grid">
              <div className="sp-hm-header"><span></span>{['Wk1','Wk2','Wk3','Wk4','Wk5','Wk6'].map(w=><span key={w}>{w}</span>)}</div>
              {[{s:'SKU001',d:['ok','ok','warning','critical','critical','critical']},{s:'SKU002',d:['ok','ok','ok','warning','warning','critical']},{s:'SKU003',d:['ok','ok','ok','ok','warning','warning']},{s:'SKU004',d:['ok','ok','ok','ok','ok','ok']},{s:'SKU005',d:['warning','critical','critical','critical','critical','critical']}].map((r,i)=>(
                <div key={i} className="sp-hm-row"><span className="sp-hm-label">{r.s}</span>{r.d.map((v,j)=>(<span key={j} className="sp-hm-cell" style={{background:v==='ok'?'#10b981':v==='warning'?'#f59e0b':'#ef4444',color:'#fff'}}>{v}</span>))}</div>
              ))}
            </div>
          </div>

          <div className="sp-card">
            <h3>Inventory Aging Distribution</h3>
            <CC type="bar" height={260} series={[{name:'0-30d',data:[120,85,95,110,75]},{name:'31-60d',data:[45,35,40,38,28]},{name:'61-90d',data:[22,18,15,20,12]},{name:'91-120d',data:[8,12,10,8,6]},{name:'120d+',data:[5,8,6,4,3]}]} options={{chart:{toolbar:{show:false},stacked:true},colors:['#10b981','#34d399','#fbbf24','#f59e0b','#ef4444'],plotOptions:{bar:{columnWidth:'50%'}},xaxis:{categories:['Clothing','Electronics','Home','Sports','Beauty']},legend:{position:'top'}}} />
            <div className="sp-callout">Dead Stock Value: $12,400 (120d+ items)</div>
          </div>

          <div className="sp-card">
            <h3>Reorder Suggestions</h3>
            <table className="sp-table"><thead><tr><th>SKU</th><th>Product</th><th>Available</th><th>Velocity/Day</th><th>Lead Time</th><th>Safety Stock</th><th>Reorder Pt</th><th>Suggested Qty</th><th>Priority</th></tr></thead><tbody>
              {[['SKU001','Headphones',12,8,7,20,76,100,'critical'],['SKU002','Cotton Tee',45,6,5,15,45,60,'warning'],['SKU003','Smart Watch',180,5,10,25,75,0,'ok'],['SKU004','Running Shoes',85,4,7,12,40,0,'ok']].map((r:any,i)=>(
                <tr key={i}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td>{r[4]}d</td><td>{r[5]}</td><td>{r[6]}</td><td>{r[7]}</td><td><span className={`sp-badge sp-badge-${r[8]}`}>{r[8]}</span></td></tr>
              ))}
            </tbody></table>
            <div className="sp-footer-actions"><button className="sp-btn sp-btn-primary">Export CSV</button><button className="sp-btn sp-btn-outline">Create Draft PO</button></div>
          </div>
        </>
      )}

      {tab === 'returns' && (
        <>
          <div className="sp-kpi-row">
            {[{l:'RETURN RATE',v:'4.2%',c:'+0.5%',cl:'#ef4444'},{l:'TOTAL REFUNDS',v:'$8,420',c:'+12%',cl:'#ef4444'},{l:'UNITS RETURNED',v:'347',c:'+8%',cl:'#ef4444'},{l:'REFUND % REV',v:'5.9%',c:'+0.8%',cl:'#ef4444'},{l:'AVG TIME TO RETURN',v:'8.2d',c:'-1.2d',cl:'#10b981'},{l:'RETURN OUTLIERS',v:'12',c:'+3',cl:'#ef4444'}].map((k,i)=>(
              <div key={i} className="sp-kpi-card"><span className="sp-kpi-label">{k.l}</span><div className="sp-kpi-value">{k.v}</div><span className="sp-kpi-change" style={{color:k.cl}}>{k.c}</span></div>
            ))}
          </div>

          <div className="sp-grid sp-grid-2">
            <div className="sp-card">
              <h3>Refund/Return Rate Trend (Weekly)</h3>
              <CC type="line" height={250} series={[{name:'Return Rate',type:'line',data:[3.8,4.0,3.5,4.2,3.9,4.5,4.1,4.2,3.8,4.6,4.3,4.2]},{name:'Returns',type:'bar',data:[28,32,25,35,30,38,33,35,28,40,35,34]}]} options={{chart:{toolbar:{show:false}},stroke:{width:[3,0],curve:'smooth'},colors:['#ef4444','#94a3b8'],xaxis:{categories:['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10','W11','W12']},yaxis:[{title:{text:'Rate %'},min:0,max:6},{opposite:true,title:{text:'Returns'}}],legend:{position:'top'}}} />
            </div>
            <div className="sp-card">
              <h3>Return Reasons Breakdown</h3>
              <CC type="donut" height={250} series={[35,25,18,12,10]} options={{labels:['Size Issue','Quality','Wrong Item','Changed Mind','Damaged'],colors:['#ef4444','#f59e0b','#1a73e8','#8b5cf6','#94a3b8'],chart:{toolbar:{show:false}},plotOptions:{pie:{donut:{size:'60%',labels:{show:true,total:{show:true,label:'Total',formatter:()=>'347'}}}}},legend:{position:'bottom'}}} />
            </div>
          </div>

          <div className="sp-grid sp-grid-2">
            <div className="sp-card">
              <h3>Return Rate vs Revenue (Scatter)</h3>
              <CC type="scatter" height={250} series={[{name:'Ideal Zone',data:[[8200,1.5],[12400,2.1],[15400,2.8],[9600,1.8]]},{name:'Danger Zone',data:[[5800,5.2],[7200,6.1],[4200,4.8],[3800,5.5]]}]} options={{chart:{toolbar:{show:false}},colors:['#10b981','#ef4444'],xaxis:{title:{text:'Revenue ($)'},labels:{formatter:(v:number)=>'$'+(v/1000)+'K'}},yaxis:{title:{text:'Return Rate (%)'}},markers:{size:10},legend:{position:'top'}}} />
            </div>
            <div className="sp-card">
              <h3>Variant Return Heatmap (Size x Color)</h3>
              <div className="sp-heatmap-grid">
                <div className="sp-hm-header"><span></span>{['Black','White','Red','Blue'].map(c=><span key={c}>{c}</span>)}</div>
                {['S','M','L','XL'].map((sz,i)=>(
                  <div key={i} className="sp-hm-row"><span className="sp-hm-label">{sz}</span>
                    {[2,4,8,5,3,2,6,4,1,3,5,3,4,6,10,7].slice(i*4,i*4+4).map((v,j)=>(
                      <span key={j} className="sp-hm-cell" style={{background:v>6?'#ef4444':v>3?'#f59e0b':'#10b981',color:'#fff'}}>{v}%</span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="sp-card">
            <h3>Top Return SKUs - Action Table</h3>
            <table className="sp-table"><thead><tr><th>SKU</th><th>Product</th><th>Returns</th><th>Rate %</th><th>Reason</th><th>Action</th></tr></thead><tbody>
              {[['SKU003','Smart Watch',45,5.2,'Quality','investigate'],['SKU008','Shirt XL',38,8.1,'Size','update-sizing'],['SKU012','Shoes B',28,4.5,'Damaged','fix-packaging'],['SKU015','Widget Z',22,12.3,'Wrong Item','review-listing']].map((r:any,i)=>(
                <tr key={i}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td style={{color:'#ef4444'}}>{r[3]}%</td><td>{r[4]}</td><td><button className="sp-btn sp-btn-sm">{r[5]}</button></td></tr>
              ))}
            </tbody></table>
          </div>
        </>
      )}

      <div className="sp-footer-actions">
        <button className="sp-btn sp-btn-primary">Export Report</button>
        <button className="sp-btn sp-btn-outline">Schedule</button>
      </div>
    </div>
  );
}
