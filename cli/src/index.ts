#!/usr/bin/env node
import { Command } from "commander";
import ora from "ora";
import path from "node:path";
import { scaffold } from "./scaffold.js";
import { validateProjectName } from "./utils.js";

const program = new Command();

program
  .name("create-universal-auth-app")
  .description("Scaffold a new universal-auth-boilerplate project")
  .argument("<project-name>", "Name of the new project (kebab-case recommended)")
  .option("-d, --dir <dir>", "Target parent directory (default: current working directory)", process.cwd())
  .option("-t, --template <flavor>", "Use an alternative template flavor (e.g. 'minimal')")
  .option("--no-install", "Skip the post-scaffold dependency install step")
  .option("-f, --force", "Overwrite targetDir if it already exists")
  .action(async (projectName, options) => {
    const slug = validateProjectName(projectName);
    // When -d is provided, join it with the project slug so the new project
    // becomes a sibling folder inside the target dir instead of replacing the
    // target dir itself.  Without -d the cwd *is* the parent.
    const targetDir = options.dir
      ? path.resolve(options.dir, slug)
      : path.resolve(process.cwd(), slug);
    const spinner = ora(`Scaffolding ${slug}...`).start();

    try {
      const result = await scaffold(slug, targetDir, {
        template: options.template,
        noInstall: options.noInstall,
        force: options.force,
      });
      spinner.succeed(result.message);
    } catch (err) {
      spinner.fail(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program.parse();
