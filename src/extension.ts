import { commands, ExtensionContext, workspace } from "vscode";
import { createConfigFile } from "./commands";
import { ConfigResolver } from "./ConfigResolver";
import { IgnorerResolver } from "./IgnorerResolver";
import { LoggingService } from "./LoggingService";
import { ModuleResolver } from "./ModuleResolver";
import { NotificationService } from "./NotificationService";
import PrettierEditService from "./PrettierEditService";
import { StatusBar } from "./StatusBar";
import { TemplateService } from "./TemplateService";
import { getConfig } from "./util";
import { RESTART_TO_ENABLE, EXTENSION_DISABLED } from "./message";
import { setGlobalState, setWorkspaceState } from "./stateUtils";

// the application insights key (also known as instrumentation key)
const extensionName = process.env.EXTENSION_NAME || "dev.prettier-vscode";
const extensionVersion = process.env.EXTENSION_VERSION || "0.0.0";

export function activate(context: ExtensionContext) {
  const loggingService = new LoggingService();

  loggingService.logInfo(`Extension Name: ${extensionName}.`);
  loggingService.logInfo(`Extension Version: ${extensionVersion}.`);

  const { enable } = getConfig();
  if (!enable) {
    loggingService.logInfo(EXTENSION_DISABLED);
    context.subscriptions.push(
      workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("prettier.enable")) {
          loggingService.logWarning(RESTART_TO_ENABLE);
        }
      })
    );
    return;
  }

  setGlobalState(context.globalState);
  setWorkspaceState(context.workspaceState);

  const templateService = new TemplateService(loggingService);
  const ignoreResolver = new IgnorerResolver(loggingService);
  const configResolver = new ConfigResolver(loggingService);
  const notificationService = new NotificationService(loggingService);

  const moduleResolver = new ModuleResolver(
    loggingService,
    notificationService
  );

  const statusBar = new StatusBar();

  const editService = new PrettierEditService(
    moduleResolver,
    ignoreResolver,
    configResolver,
    loggingService,
    notificationService,
    statusBar
  );

  const createConfigFileFunc = createConfigFile(templateService);
  const createConfigFileCommand = commands.registerCommand(
    "prettier.createConfigFile",
    createConfigFileFunc
  );
  const resetModuleExecutionStateCommand = commands.registerCommand(
    "prettier.resetModuleExecutionState",
    moduleResolver.resetModuleExecutionState
  );
  const openOutputCommand = commands.registerCommand(
    "prettier.openOutput",
    () => {
      loggingService.show();
    }
  );

  context.subscriptions.push(
    editService,
    createConfigFileCommand,
    resetModuleExecutionStateCommand,
    openOutputCommand,
    ...editService.registerDisposables()
  );
}
