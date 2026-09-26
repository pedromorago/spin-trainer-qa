plugins {
    alias(libs.plugins.spotless)
}

// Spotless downloads ktlint from the root project's repository.
repositories { mavenCentral() }

// Pinned copies of what spin-trainer-api publishes (sibling repos): the contract (specCheck / specSync) and the seed's
// reference ranges, the tests' oracle (rangesCheck / rangesSync). Check fails if the API changed its version; sync
// brings it in. The contract copy has a first line that says where it comes from.
fun pinnedCopy(
    name: String,
    copyPath: String,
    sourcePath: String,
    header: Boolean,
) {
    val copy = layout.projectDirectory.file(copyPath).asFile
    val source = layout.projectDirectory.file("../spin-trainer-api/$sourcePath").asFile
    tasks.register("${name}Check") {
        group = "verification"
        description = "Falla si $copyPath difiere de ../spin-trainer-api/$sourcePath."
        doLast {
            fun body(text: String) = text.replace("\r\n", "\n").let { if (header) it.substringAfter('\n') else it }
            if (!source.exists()) {
                logger.lifecycle("${name}Check: no existe {}; nada que comparar.", source)
            } else if (body(source.readText()) != body(copy.readText())) {
                throw GradleException("$copyPath difiere de spin-trainer-api/$sourcePath: ejecuta gradlew ${name}Sync")
            } else {
                logger.lifecycle("${name}Check: $copyPath está al día.")
            }
        }
    }
    tasks.register("${name}Sync") {
        group = "contract"
        description = "Copia ../spin-trainer-api/$sourcePath en $copyPath."
        doLast {
            fun body(text: String) = text.replace("\r\n", "\n").let { if (header) it.substringAfter('\n') else it }
            val firstLine = if (header) copy.readText().substringBefore('\n') + "\n" else ""
            copy.writeText(firstLine + body(source.readText()))
            logger.lifecycle("${name}Sync: $copyPath actualizado.")
        }
    }
}

pinnedCopy("spec", "contract/openapi.yaml", "openapi.yaml", header = true)
pinnedCopy("ranges", "contract/reference-ranges.json", "reference-ranges.json", header = false)

spotless {
    kotlinGradle {
        target("*.gradle.kts", "api-tests/*.gradle.kts")
        ktlint()
    }
    format("misc") {
        target(
            "*.md",
            "*.json",
            "docs/**/*.md",
            "env/**/*.yml",
            "env/**/*.sql",
            "env/**/*.sh",
            "newman/*.json",
            "scripts/**/*.mjs",
            "scripts/**/*.mts",
            "e2e/**/*.ts",
            "e2e/**/*.json",
            "allurerc.mjs",
            "api-tests/src/test/resources/features/**/*.feature",
            ".github/**/*.yml",
            ".gitignore",
        )
        trimTrailingWhitespace()
        endWithNewline()
    }
}
