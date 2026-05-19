const crypto = require('crypto');

/**
 * Production-ready Webhook Signer
 * Used to notify the Gas Billing Desk that payment is successful.
 */
function signWebhookPayload(payload, secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
    
    const signature = crypto
        .createHmac('sha256', secret)
        .update(signaturePayload)
        .digest('hex');

    return {
        'X-MIG-Signature': `t=${timestamp},v1=${signature}`,
        payload
    };
}

// Fraud Rule Example: 
// IF transaction_count > 5 IN 1 minute FROM same_ip THEN block
const fraudCheck = (ip, history) => {
    const recent = history.filter(h => (Date.now() - h.time) < 60000);
    return recent.length < 5;
};

module.exports = { signWebhookPayload, fraudCheck };