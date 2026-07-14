async function testApi() {
  try {
    // 1. Login to get token
    const loginRes = await fetch('http://localhost:8081/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@ticketbooking.com',
        password: 'admin123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log("Token exists:", !!token);

    // 2. Call the endpoint
    const res = await fetch('http://localhost:8081/api/venue-seats/layout/f2ca9b05-b1c6-4cf5-9083-1194543d5898/categories', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        console.log("ERROR STATUS:", res.status);
        console.log("ERROR BODY:", await res.text());
    } else {
        const data = await res.json();
        console.log("SUCCESS:", JSON.stringify(data));
    }
  } catch (error) {
    console.log("ERROR:", error.message);
  }
}

testApi();
