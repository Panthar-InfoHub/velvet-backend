import axios from "axios";
import { env } from "../../lib/config-env.js";

class KycFinnsysServiceClass {
    kyc_base_url: string;

    constructor() {
        this.kyc_base_url = `${env.KYC_BASE_URL}/kyc/v1`;
    }


    channel_login = async (data: any) => {
        const response = await axios.post(`${this.kyc_base_url}/channels/login`, data);
        return response.data;
    }


    onboarding_login = async (data: any, kyc_access_token: string) => {
        const response = await axios.post(`${this.kyc_base_url}/onboardings/login`, data, {
            headers: {
                "Authorization": `${kyc_access_token}`
            }
        });
        return response.data;
    }

    digilocker_create_link = async (data: any, kyc_access_token: string) => {
        const response = await axios.post(`${this.kyc_base_url}/onboardings/execute`, data, {
            headers: {
                "Authorization": `${kyc_access_token}`
            }
        });
        return response.data;
    }

    user_digilocker_data = async (merchant_id: string, kyc_access_token: string, inv_id: any) => {
        const data = {
            arn: env.ARN,
            investorId: inv_id,
            merchantId: merchant_id,
            inputData: {
                service: "identity",
                type: "aadhaarDigiLocker",
                task: "getDetails",
                data: {
                    images: [],
                    toVerifyData: {},
                    searchParam: {},
                    proofType: "identity"
                }
            }
        };



        const response = await axios.post(`${this.kyc_base_url}/onboardings/execute`, data, {
            headers: {
                "Authorization": `${kyc_access_token}`
            }
        });
        return response.data;
    }


    private update_form = async (kyc_access_token: string, merchant_id: string, inv_id: string, type: string, data: object) => {
        const payload = {
            arn: env.ARN,
            investorId: inv_id,
            merchantId: merchant_id,
            save: "formData",
            type,
            data
        };
        const response = await axios.post(`${this.kyc_base_url}/onboardings/updateForm`, payload, {
            headers: { "Authorization": `${kyc_access_token}` }
        });
        return response.data;
    }

    update_kyc_data = async (kyc_data: any, kyc_access_token: string, merchant_id: string, inv_id: string) => {
        return this.update_form(kyc_access_token, merchant_id, inv_id, "kycdata", {
            type: "kycdata",
            kycData: kyc_data
        });
    }

    update_fatca_data = async (kyc_access_token: string, merchant_id: string, inv_id: string) => {
        return this.update_form(kyc_access_token, merchant_id, inv_id, "fatca", {
            type: "fatca",
            fatcaData: {
                pep: "NO",
                rpep: "NO",
                residentForTaxInIndia: "NO",
                relatedPerson: "NO"
            }
        });
    }

    update_signature = async (signature_url: string, kyc_access_token: string, merchant_id: string, inv_id: string) => {
        return this.update_form(kyc_access_token, merchant_id, inv_id, "signature", {
            type: "signature",
            signatureImageUrl: signature_url,
            consent: "true"
        });
    }

    update_photo = async (photo_url: string, kyc_access_token: string, merchant_id: string, inv_id: string) => {
        return this.update_form(kyc_access_token, merchant_id, inv_id, "userPhoto", {
            photoUrl: photo_url
        });
    }

    private execute_onboarding = async (kyc_access_token: string, merchant_id: string, inv_id: string, inputData: object) => {
        const payload = {
            arn: env.ARN,
            investorId: inv_id,
            merchantId: merchant_id,
            inputData
        };
        const response = await axios.post(`${this.kyc_base_url}/onboardings/execute`, payload, {
            headers: { "Authorization": `${kyc_access_token}` }
        });
        return response.data;
    }

    create_contract_pdf = async (kyc_access_token: string, merchant_id: string, inv_id: string) => {
        return this.execute_onboarding(kyc_access_token, merchant_id, inv_id, {
            service: "esign",
            type: "",
            task: "createPdf",
            data: {}
        });
    }

    save_esign_pdf = async (kyc_access_token: string, merchant_id: string, inv_id: string) => {
        return this.execute_onboarding(kyc_access_token, merchant_id, inv_id, {
            service: "esign",
            type: "",
            task: "getEsignData",
            data: {}
        });
    }

    execute_verification = async (kyc_access_token: string, merchant_id: string, inv_id: string) => {
        return this.execute_onboarding(kyc_access_token, merchant_id, inv_id, {
            service: "verificationEngine",
            merchantId: merchant_id
        });
    }
}

export const kyc_finnsys_service = new KycFinnsysServiceClass()