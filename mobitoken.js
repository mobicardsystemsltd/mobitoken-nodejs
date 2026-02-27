const crypto = require('crypto');
const axios = require('axios');

class MobicardTokenization {
    constructor(merchantId, apiKey, secretKey) {
        this.mobicardVersion = "2.0";
        this.mobicardMode = "LIVE";
        this.mobicardMerchantId = merchantId;
        this.mobicardApiKey = apiKey;
        this.mobicardSecretKey = secretKey;
        this.mobicardServiceId = "20000";
        this.mobicardServiceType = "TOKENIZATION";
        
        this.mobicardTokenId = Math.floor(Math.random() * (1000000000 - 1000000 + 1)) + 1000000;
        this.mobicardTxnReference = Math.floor(Math.random() * (1000000000 - 1000000 + 1)) + 1000000;
    }

    generateJWT(cardData) {
        const jwtHeader = { typ: "JWT", alg: "HS256" };
        const encodedHeader = Buffer.from(JSON.stringify(jwtHeader)).toString('base64url');

        const jwtPayload = {
            mobicard_version: this.mobicardVersion,
            mobicard_mode: this.mobicardMode,
            mobicard_merchant_id: this.mobicardMerchantId,
            mobicard_api_key: this.mobicardApiKey,
            mobicard_service_id: this.mobicardServiceId,
            mobicard_service_type: this.mobicardServiceType,
            mobicard_token_id: this.mobicardTokenId.toString(),
            mobicard_txn_reference: this.mobicardTxnReference.toString(),
            mobicard_single_use_token_flag: cardData.singleUseToken ? "1" : "0",
            mobicard_card_number: cardData.cardNumber,
            mobicard_card_expiry_month: cardData.expiryMonth,
            mobicard_card_expiry_year: cardData.expiryYear,
            mobicard_custom_one: cardData.customOne || "mobicard_custom_one",
            mobicard_custom_two: cardData.customTwo || "mobicard_custom_two",
            mobicard_custom_three: cardData.customThree || "mobicard_custom_three",
            mobicard_extra_data: cardData.extraData || "your_custom_data_here_will_be_returned_as_is"
        };

        const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');

        const headerPayload = `${encodedHeader}.${encodedPayload}`;
        const signature = crypto.createHmac('sha256', this.mobicardSecretKey)
            .update(headerPayload)
            .digest('base64url');

        return `${encodedHeader}.${encodedPayload}.${signature}`;
    }

    async tokenizeCard(cardData) {
        try {
            const jwtToken = this.generateJWT(cardData);
            
            const url = "https://mobicardsystems.com/api/v1/card_tokenization";
            const payload = { mobicard_auth_jwt: jwtToken };

            const response = await axios.post(url, payload, {
                httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
            });

            const responseData = response.data;

            if (responseData.status === 'SUCCESS') {
                return {
                    status: 'SUCCESS',
                    cardToken: responseData.card_information.card_token,
                    cardNumberMasked: responseData.card_information.card_number_masked,
                    rawResponse: responseData
                };
            } else {
                return {
                    status: 'ERROR',
                    statusCode: responseData.status_code,
                    statusMessage: responseData.status_message
                };
            }
        } catch (error) {
            return {
                status: 'ERROR',
                errorMessage: error.message
            };
        }
    }
}

// Usage
async function main() {
    const tokenizer = new MobicardTokenization(
        "4",
        "YmJkOGY0OTZhMTU2ZjVjYTIyYzFhZGQyOWRiMmZjMmE2ZWU3NGIxZWM3ZTBiZSJ9",
        "NjIwYzEyMDRjNjNjMTdkZTZkMjZhOWNiYjIxNzI2NDQwYzVmNWNiMzRhMzBjYSJ9"
    );

    const result = await tokenizer.tokenizeCard({
        cardNumber: "4242424242424242",
        expiryMonth: "02",
        expiryYear: "28",
        singleUseToken: false
    });

    if (result.status === 'SUCCESS') {
        console.log("Tokenization Successful!");
        console.log(`Card Token: ${result.cardToken}`);
        console.log(`Masked Card: ${result.cardNumberMasked}`);
    } else {
        console.log(`Error: ${result.statusMessage}`);
    }
}

main();
