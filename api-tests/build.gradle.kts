plugins {
    java
    alias(libs.plugins.openapi.generator)
    alias(libs.plugins.spotless)
    alias(libs.plugins.allure)
}

java {
    toolchain { languageVersion = JavaLanguageVersion.of(21) }
}

repositories { mavenCentral() }

// Modelos de petición y respuesta generados desde el contrato fijado (contract/openapi.yaml): si la spec cambia, los
// tests dejan de compilar donde toque. Las peticiones inválidas se escriben a mano (JSON crudo) a propósito.
val generatedModels = layout.buildDirectory.dir("generated/openapi")

openApiGenerate {
    generatorName = "java"
    library = "rest-assured"
    inputSpec = rootProject.layout.projectDirectory.file("contract/openapi.yaml")
    outputDir = generatedModels
    modelPackage = "com.pedromorago.spintrainer.qa.model"
    apiPackage = "com.pedromorago.spintrainer.qa.generated.api"
    invokerPackage = "com.pedromorago.spintrainer.qa.generated"
    globalProperties.putAll(mapOf("models" to "", "modelDocs" to "false", "modelTests" to "false"))
    configOptions.putAll(
        mapOf(
            "openApiNullable" to "false",
            "serializationLibrary" to "jackson",
            "useJakartaEe" to "true",
            "useBeanValidation" to "false",
            "dateLibrary" to "java8",
            "hideGenerationTimestamp" to "true",
            "sourceFolder" to "src/main/java",
        ),
    )
}

sourceSets.main { java.srcDir(generatedModels.map { it.dir("src/main/java") }) }

tasks.compileJava { dependsOn(tasks.openApiGenerate) }

tasks.withType<JavaCompile>().configureEach { options.encoding = "UTF-8" }

dependencies {
    implementation(platform(libs.junit.bom))
    implementation(platform(libs.jackson.bom))
    implementation(platform(libs.cucumber.bom))
    implementation(platform(libs.allure.bom))

    // El framework (src/main) es una librería de pruebas: cliente, autenticación, contrato, datos y aserciones.
    implementation(libs.rest.assured)
    implementation(libs.assertj)
    implementation(libs.jackson.databind)
    implementation(libs.jackson.datatype.jsr310)
    implementation(libs.jackson.dataformat.yaml)
    implementation(libs.json.schema.validator)
    implementation(libs.nimbus.jose.jwt)
    implementation(libs.datafaker)
    implementation(libs.testcontainers)
    implementation(libs.allure.rest.assured)
    implementation(libs.jakarta.annotation)
    implementation(libs.junit.jupiter)
    implementation(libs.junit.platform.launcher)

    testImplementation(libs.junit.jupiter)
    testImplementation(libs.junit.platform.suite)
    testImplementation(libs.allure.junit5)
    testImplementation(libs.cucumber.java)
    testImplementation(libs.cucumber.junit.platform.engine)
    testImplementation(libs.cucumber.picocontainer)
    testImplementation(libs.allure.cucumber7.jvm)
    testRuntimeOnly(libs.junit.platform.launcher)
    testRuntimeOnly(libs.slf4j.simple)
}

tasks.test {
    useJUnitPlatform {
        // -Ptags=smoke: solo los casos de humo (expresión de tags de JUnit).
        providers.gradleProperty("tags").orNull?.let { includeTags(it) }
    }
    // Rutas del repo (entorno, clave de QA, contrato) y configuración por -Pqa.* o variables QA_*.
    systemProperty("qa.rootDir", rootProject.layout.projectDirectory.asFile.absolutePath)
    providers.gradlePropertiesPrefixedBy("qa.").get().forEach { (key, value) -> systemProperty(key, value) }
    testLogging {
        events("failed")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
    }
}

allure {
    version =
        libs.versions.allure.java
            .get()
    adapter {
        autoconfigure = false
        aspectjWeaver = true
    }
}

spotless {
    java {
        target("src/*/java/**/*.java")
        palantirJavaFormat(
            libs.versions.palantir.java.format
                .get(),
        )
        removeUnusedImports()
    }
}
