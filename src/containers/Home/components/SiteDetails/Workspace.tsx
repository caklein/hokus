import * as React from "react";
import { SiteConfig, WorkspaceHeader, WorkspaceConfig } from "../../../../../global-types";
import { InfoLine } from "../shared";
import { FlatButton, TextField, RaisedButton } from "material-ui";
import { TriggerWithOptions } from "../../../../components/TriggerWithOptions";
import IconFileFolder from "material-ui/svg-icons/file/folder";
import service from "./../../../../services/service";
import { blockingOperationService, snackMessageService } from "../../../../services/ui-service";
import { NavigationMoreVert } from "material-ui/svg-icons";
import { withRouter, RouteComponentProps } from "react-router-dom";

interface WorkspaceProps extends RouteComponentProps {
  site: SiteConfig;
  header: WorkspaceHeader;
  active: boolean;
  onLocationClick: (location: string) => void;
  onStartServerClick: (workspace: WorkspaceHeader, serveKey: string) => void;
  onSelectWorkspaceClick: (e: any, siteKey: string, workspace: WorkspaceHeader) => void;
  onPublishClick: (workspaceHeader: WorkspaceHeader, workspace: WorkspaceConfig) => void;
  onDeleteWorkspace?: (siteKey: string, workspaceKey: string) => void;
}

interface WorkspaceState {
  config?: WorkspaceConfig | null;
  error?: any;
  refreshing: boolean;
  canSync?: boolean | null;
}

class _Workspace extends React.Component<WorkspaceProps, WorkspaceState> {
  constructor(props: WorkspaceProps) {
    super(props);
    this.state = { error: null, refreshing: false };
  }

  handleOnStartServerOptionClick = (event: any, index: number) => {
    let cfg = this.state.config;
    if (cfg == null) throw new Error("Invalid operation");
    this.props.onStartServerClick(this.props.header, cfg.serve[index].key);
    return true;
  };
  handleOpenLocation = () => {
    this.props.onLocationClick(this.props.header.path);
  };
  handleWorkspaceSelect = (e: any) => {
    this.props.onSelectWorkspaceClick(e, this.props.site.key, this.props.header);
  };
  handlePublishClick = () => {
    if (this.state.config != null) this.props.onPublishClick(this.props.header, this.state.config);
  };
  handleSyncClick = async () => {
    if (this.state.config != null) {
      const operation = "sync";
      blockingOperationService.startOperation({ key: operation, title: "Syncing workspace..." });
      try {
        await service.api.syncWorkspace(this.props.site.key, this.props.header.key);
        await this.refreshCanSync();
      } catch (e) {
        snackMessageService.addSnackMessage("Failed to sync workspace.");
      } finally {
        blockingOperationService.endOperation(operation);
      }
    }
  };
  handleRefreshClick = () => {
    this.setState({ error: null, refreshing: true });
    this.load();
  };

  componentDidMount = () => {
    this.load();
  };

  refreshCanSync = async () => {
    const siteKey = this.props.site.key;
    const workspaceKey = this.props.header.key;
    if (this.props.site.canSync) {
      const canSync = await service.api.canSyncWorkspace(siteKey, workspaceKey);
      this.setState({ canSync });
    }
  };

  load = async () => {
    const siteKey = this.props.site.key;
    const workspaceKey = this.props.header.key;
    this.setState({ refreshing: true });
    try {
      const config = await service.getWorkspaceDetails(siteKey, workspaceKey);
      this.setState({ config, error: null });
      await this.refreshCanSync();
    } catch (error) {
      this.setState({ config: null, error: error });
    } finally {
      this.setState({ refreshing: false });
    }
  };

  deleteWorkspace = async () => {
    if (window.confirm("Are you sure you want do delete this workspace?")) {
      this.props.onDeleteWorkspace?.(this.props.site.key, this.props.header.key);
    }
  };

  render() {
    let { active, header, site } = this.props;
    let { config, error } = this.state;
    let publishDisabled =
      config == null ||
      config.build == null ||
      config.build.length == 0 ||
      site.publish == null ||
      site.publish.length == 0;
    let startServerDisabled = config == null || config.serve == null || config.serve.length == 0;

    return (
      <div style={{ opacity: this.state.refreshing ? 0.5 : 1 }}>
        <div style={{ float: "right", marginRight: "6px" }}>
          <TriggerWithOptions
            onOptionClick={(e, index) => {
              if (index === 0) {
                this.props.history.push(
                  `/sites/${encodeURIComponent(site.key)}/workspaces/${encodeURIComponent(header.key)}/config`
                );
              }
              if (index === 1) {
                this.deleteWorkspace();
              }
              return true;
            }}
            options={["Edit Configurations", "Delete Workspace"]}
            triggerType={FlatButton}
            triggerProps={{ icon: <NavigationMoreVert />, style: { minWidth: 40 } }}
          />
        </div>
        <InfoLine label="Location">
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <FlatButton style={{ minWidth: "40px" }} icon={<IconFileFolder />} onClick={this.handleOpenLocation} />
            <TextField id="location" value={header.path} fullWidth={true} />
          </div>
        </InfoLine>
        {error != null && (
          <InfoLine label="Validation Error">
            <p style={{ color: "#EC407A" }}>{error}</p>
            <FlatButton primary={true} label="Refresh" onClick={this.handleRefreshClick} />
          </InfoLine>
        )}
        <InfoLine childrenWrapperStyle={{ marginTop: "8px" }} label="Actions">
          <RaisedButton
            label="Select"
            disabled={config == null}
            primary={active}
            onClick={this.handleWorkspaceSelect}
          />
          &nbsp;
          <TriggerWithOptions
            triggerType={FlatButton}
            triggerProps={{
              label: "Start Server",
              disabled: startServerDisabled
            }}
            options={config != null && config.serve != null ? config.serve.map(x => x.key || "default") : []}
            onOptionClick={this.handleOnStartServerOptionClick}
          />
          {site.canSync !== undefined && (
            <React.Fragment>
              &nbsp;
              <FlatButton label="Sync" secondary={this.state.canSync === true} onClick={this.handleSyncClick} />
            </React.Fragment>
          )}
          &nbsp;
          <FlatButton label="Publish" disabled={publishDisabled} onClick={this.handlePublishClick} />
        </InfoLine>
      </div>
    );
  }
}

export const Workspace = withRouter(_Workspace);
