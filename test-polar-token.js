const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testToken() {
  const token = 'polar_oat_7zPrN88v9NJofAZqpCTz1KzNQcVHfpQJkBBPL1RQ76a'; // 현재 사용 중인 토큰 (수정됨)
  const url = 'https://sandbox-api.polar.sh/v1/customers';

  console.log('Testing Polar Token directly via fetch...');
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Token is valid!');
      console.log('Customers Count:', data.items?.length || 0);
    } else {
      console.error('❌ Token is invalid (Direct API call):');
      console.error('Status:', response.status);
      console.error('Error Details:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error during fetch:', error.message);
  }
}

testToken();
