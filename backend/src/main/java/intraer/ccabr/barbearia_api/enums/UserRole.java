package intraer.ccabr.barbearia_api.enums;

public enum UserRole {
    ADMIN("admin"),
    USER("user"),
    OFICIAL("oficial"),
    GRADUADO("graduado");

    private String role;

    UserRole(String role) {
        this.role = role;
    }

    public String getRole() {
        return role;
    }
}
