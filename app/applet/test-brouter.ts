import https from 'https';

const url = 'https://brouter.de/brouter?lonlats=10.0,45.0|10.1,45.1&profile=car-eco&format=geojson';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(data.substring(0, 500));
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
