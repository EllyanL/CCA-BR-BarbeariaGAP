package intraer.ccabr.barbearia_api.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

public class OmsResponse {
    @JsonProperty("cd_org")
    private Long cdOrg;

    @JsonProperty("sg_org")
    private String sgOrg;

    @JsonProperty("nm_org")
    private String nmOrg;

    // Getters e Setters
    public Long getCdOrg() {
        return cdOrg;
    }

    public void setCdOrg(Long cdOrg) {
        this.cdOrg = cdOrg;
    }

    public String getSgOrg() {
        return sgOrg;
    }

    public void setSgOrg(String sgOrg) {
        this.sgOrg = sgOrg;
    }

    public String getNmOrg() {
        return nmOrg;
    }

    public void setNmOrg(String nmOrg) {
        this.nmOrg = nmOrg;
    }

    @Override
    public String toString() {
        return "OmsResponse{cdOrg=" + cdOrg + ", sgOrg='" + sgOrg + "', nmOrg='" + nmOrg + "'}";
    }
}