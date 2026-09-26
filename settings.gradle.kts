plugins {
    // Descarga el JDK 21 si la máquina no lo tiene (toolchains de Gradle).
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}

rootProject.name = "spin-trainer-qa"

include("api-tests")
