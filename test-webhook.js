const { validateEvent } = require("@polar-sh/sdk/webhooks");
const crypto = require("crypto");

async function testWebhook() {
  const secret = 'polar_whs_kMdSBV0sFJUgYHTqyHcLnL47yjQp3BQouoHkz00HHqK'; // 현재 .env.local의 시크릿
  const payload = JSON.stringify({
    type: "order.paid",
    data: {
      id: "test_order_id",
      amount: 2000,
      customer_id: "test_customer_id",
      product_id: "test_product_id",
      metadata: { userId: "test_user_id" }
    }
  });

  // Polar webhook signature 생성 시뮬레이션 (validateEvent가 내부적으로 수행하는 것과 유사한 방식)
  // 실제 Polar 서버는 전용 알고리즘으로 서명하지만, 
  // 여기서는 단순히 validateEvent가 이 시크릿으로 유효성 검사를 통과할 수 있는지 확인하기 위함입니다.
  // 주의: 직접 서명을 만드는 것은 복잡하므로, validateEvent가 에러를 던지는지 확인하는 방식으로 테스트합니다.
  
  console.log('Testing Webhook Secret validation logic...');
  
  try {
    // 임의의 헤더와 바디로 validateEvent 호출
    // 서명이 맞지 않으면 "Webhook signature is invalid" 에러가 발생해야 함
    // 만약 시크릿 자체가 형식이 잘못되었다면 다른 에러가 발생할 수 있음
    
    const headers = {
      "webhook-id": "msg_2N9yL1K6G8J5H4G3F2E1D0C9B8A",
      "webhook-timestamp": Math.floor(Date.now() / 1000).toString(),
      "webhook-signature": "v1,invalid_signature_for_testing"
    };

    try {
      validateEvent(payload, headers, secret);
    } catch (e) {
      if (e.message.includes("Invalid signature") || e.message.includes("webhook-signature")) {
        console.log('✅ Webhook secret format is accepted by SDK.');
        console.log('Current Secret:', secret);
        console.log('(Note: Signature itself failed as expected because we used a dummy one, but secret was used for calculation)');
      } else {
        console.error('❌ Unexpected error during validation:', e.message);
      }
    }
  } catch (error) {
    console.error('Error during webhook test:', error.message);
  }
}

testWebhook();
