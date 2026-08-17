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
  .option("-d, --dir <dir>", "Target directory (default: current working directory)", process.cwd())
  .action(async (projectName, options) => {
    const slug = validateProjectName(projectName);
    const targetDir = path.resolve(options.dir);
    const spinner = ora(`Scaffolding ${slug}...`).start();

    try {
      const result = await scaffold(slug, targetDir);
      spinner.succeed(result.message);
    } catch (err) {
      spinner.fail(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program.parse();
