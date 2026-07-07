import https from 'https';
https.get('https://routing.openstreetmap.de/routed-car/route/v1/driving/10.0,45.0;10.1,45.1?overview=full', res => {
  let d = ''; res.on('data', c=>d+=c);
  res.on('end', () => console.log(res.statusCode, d.substring(0,200)));
});
