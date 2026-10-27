document.getElementById('createBtn').addEventListener('click', async ()=>{
  const siteUrl = document.getElementById('siteUrl').value;
  const name = document.getElementById('name').value;
  const budget = document.getElementById('budget').value;
  const keywords = document.getElementById('keywords').value;
  const geo = document.getElementById('geo').value;
  const headline = document.getElementById('headline').value;
  const description = document.getElementById('description').value;
  const status = document.getElementById('status');
  status.textContent = 'Создаю...';
  try{
    const res = await fetch('http://localhost:3000/api/campaign/create', {
      method:'POST',
      headers: {'content-type':'application/json','x-admin-token':'admin-token-demo'},
      body: JSON.stringify({siteUrl, name, budget, keywords, geo, headline, description})
    });
    const j = await res.json();
    if(j.ok) status.textContent = j.message || 'ok';
    else status.textContent = 'Ошибка: ' + (j.error || 'unknown');
  }catch(e){
    status.textContent = 'Error: ' + e.message;
  }
});

document.getElementById('listBtn').addEventListener('click', async ()=>{
  document.getElementById('campaigns').textContent = 'Loading...';
  try{
    const res = await fetch('http://localhost:3000/api/campaigns', {headers:{'x-admin-token':'admin-token-demo'}});
    const j = await res.json();
    document.getElementById('campaigns').textContent = JSON.stringify(j, null, 2);
  }catch(e){
    document.getElementById('campaigns').textContent = 'Error: ' + e.message;
  }
});
