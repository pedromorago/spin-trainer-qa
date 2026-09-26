plugins {
    // Downloads JDK 21 if the machine doesn't have it (Gradle toolchains).
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}

rootProject.name = "spin-trainer-qa"

include("api-tests")
