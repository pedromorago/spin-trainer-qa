plugins {
    alias(libs.plugins.spotless)
}

// Spotless descarga ktlint del repositorio del proyecto raíz.
repositories { mavenCentral() }

// El contrato se prueba contra una copia fijada de spin-trainer-api/openapi.yaml (repos hermanos). specCheck detecta
// que la API cambió el contrato; specSync trae la versión nueva (la primera línea dice de dónde viene).
val contractCopy = layout.projectDirectory.file("contract/openapi.yaml")
val contractSource = layout.projectDirectory.file("../spin-trainer-api/openapi.yaml")

tasks.register("specCheck") {
    group = "verification"
    description = "Falla si contract/openapi.yaml difiere de ../spin-trainer-api/openapi.yaml."
    val copy = contractCopy.asFile
    val source = contractSource.asFile
    doLast {
        fun contractBody(text: String) = text.replace("\r\n", "\n").substringAfter('\n')
        if (!source.exists()) {
            logger.lifecycle("specCheck: no existe {}; nada que comparar.", source)
        } else if (contractBody(source.readText()) != contractBody(copy.readText())) {
            throw GradleException("contract/openapi.yaml difiere de spin-trainer-api/openapi.yaml: ejecuta gradlew specSync")
        } else {
            logger.lifecycle("specCheck: contract/openapi.yaml está al día.")
        }
    }
}

tasks.register("specSync") {
    group = "contract"
    description = "Copia ../spin-trainer-api/openapi.yaml en contract/openapi.yaml."
    val copy = contractCopy.asFile
    val source = contractSource.asFile
    doLast {
        fun contractBody(text: String) = text.replace("\r\n", "\n").substringAfter('\n')
        val header = copy.readText().substringBefore('\n')
        copy.writeText(header + "\n" + contractBody(source.readText()))
        logger.lifecycle("specSync: contract/openapi.yaml actualizado.")
    }
}

spotless {
    kotlinGradle {
        target("*.gradle.kts", "api-tests/*.gradle.kts")
        ktlint()
    }
    format("misc") {
        target("*.md", "docs/**/*.md", "env/**/*.yml", "env/**/*.sql", "env/**/*.sh", ".github/**/*.yml", ".gitignore")
        trimTrailingWhitespace()
        endWithNewline()
    }
}
