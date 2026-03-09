import axios from "axios";
import { env } from "../../lib/config-env.js";
import { NSEServiceClass } from "../nse.service.js";
import logger from "../../middleware/logger.js";

class TradingAccountServiceClass extends NSEServiceClass {
    // kyc_base_url: string;

    constructor() {
        super();
        // this.kyc_base_url = `${env.KYC_BASE_URL}/kyc/v1`;
    }


    // Implement trading account related methods here
    client_registration = async (data: any) => {

        const headers = this.get_nse_headers();

        const response = await axios.post(`${this.kyc_base_url}/nse/v2/registration/client-registration`, {
            data: {
                reg_details: [data]
            }
        }, {
            headers: {
                ...headers,
                "Content-Type": "application/json"
            }
        });

        logger.debug("Client registration response from NSE API ==> ", response.data);


        // If data tax_status === 01 (Individual), need to call fatca registration API as well. This is mandatory for individual clients.
        if (data.tax_status === "01") {
            logger.debug("Client is individual, proceeding with FATCA registration...");
            // Call fatca registration API
            const fatca_data = this.extract_fatca_data(data);
            const response = await axios.post(`${this.kyc_base_url}/nse/v2/registration/fatca-registration`, {
                data: {
                    reg_details: [fatca_data]
                }
            }, {
                headers: {
                    ...headers,
                    "Content-Type": "application/json"
                }
            });

            logger.debug("FATCA registration response from NSE API ==> ", response.data);
        }

        return response.data;
    }








    private extract_fatca_data(user_input: any) {
        return {
            // --- 1. PREFILLED DATA (Mapped from input) ---
            pan_rp: user_input.pan_rp || "",
            inv_name: user_input.inv_name || "",
            dob: user_input.dob || "",
            co_bir_inc: user_input.co_bir_inc || "IN",
            tpin1: user_input.pan_rp || "",
            log_name: user_input.inv_name || "",

            // --- 2. USER INPUTS (Requested from UI) ---
            addr_type: user_input.addr_type || "1",
            po_bir_inc: user_input.po_bir_inc || "",
            srce_wealt: user_input.srce_wealt || "",
            inc_slab: user_input.inc_slab || "",
            occ_code: user_input.occ_code || "",
            occ_type: user_input.occ_type || "",
            pep_flag: user_input.pep_flag || "N",

            // --- 3. SYSTEM CONSTANTS (Do not change) ---
            tax_status: user_input.tax_status || "01",
            data_src: "E",
            id1_type: "C",
            tax_res1: "IN",
            exch_name: "O",
            ubo_appl: "N",
            ubo_df: "N",

            // --- 4. OPTIONAL/EMPTY FIELDS (Keep structural integrity) ---
            pekrn: user_input.pekrn || "",
            fr_name: user_input.fr_name || "",
            sp_name: user_input.sp_name || "",
            tax_res2: "", tpin2: "", id2_type: "",
            tax_res3: "", tpin3: "", id3_type: "",
            tax_res4: "", tpin4: "", id4_type: "",
            corp_servs: "", net_worth: "", nw_date: "",
            exemp_code: "", ffi_drnfe: "", giin_no: "",
            spr_entity: "", giin_na: "", giin_exemc: "",
            nffe_catg: "", act_nfe_sc: "", nature_bus: "",
            rel_listed: "", ubo_count: "", ubo_name: "",
            ubo_pan: "", ubo_nation: "", ubo_add1: "",
            ubo_add2: "", ubo_add3: "", ubo_city: "",
            ubo_pin: "", ubo_state: "", ubo_cntry: "",
            ubo_add_ty: "", ubo_ctr: "", ubo_tin: "",
            ubo_id_ty: "", ubo_cob: "", ubo_dob: "",
            ubo_gender: "", ubo_fr_nam: "", ubo_occ: "",
            ubo_occ_ty: "", ubo_tel: "", ubo_mobile: "",
            ubo_code: "", ubo_hol_pc: "", sdf_flag: "",
            aadhaar_rp: "", new_change: "", filler1: "", filler2: ""
        };
    }
}

export const trading_account_service = new TradingAccountServiceClass();