/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
export default (app) => {
  // Your code here
  app.log.info("Yay, the app was loaded!");

  app.on("secret_scanning_alert.created", async (context) => {
    const newAlertNumber = context.payload.alert.number;
    const repo = context.repo();

    // Fetch data for the new alert
    const { data: newAlert } = await context.octokit.secretScanning.getAlert({
      owner: repo.owner,
      repo: repo.repo,
      alert_number: newAlertNumber,
    });

    // Fetch locations data for the new alert
    const { data: newAlertLocations } = await context.octokit.request(newAlert.locations_url);

    // Fetch existing secret scanning alerts
    const { data: existingAlerts } = await context.octokit.secretScanning.listAlertsForRepo({
      owner: repo.owner,
      repo: repo.repo,
    });

    // Exclude the new alert from the list of existing alerts
    const filteredAlerts = existingAlerts.filter(alert => alert.number !== newAlertNumber);

    // Check if the new alert's secret value, file path, and line number match any existing alert
    const duplicateAlerts = [];
    for (const alert of filteredAlerts) {
      const { data: alertLocations } = await context.octokit.request(alert.locations_url);
      const isDuplicate = alert.secret === newAlert.secret &&
                          alertLocations.some(location =>
                            newAlertLocations.some(newLocation =>
                              location.path === newLocation.path &&
                              location.start_line === newLocation.start_line
                            )
                          );
      if (isDuplicate) {
        duplicateAlerts.push(alert);
      }
    }

    if (duplicateAlerts.length > 0) {
      const duplicateAlertNumbers = duplicateAlerts.map(alert => alert.number);
      app.log.info(`Duplicate secret scanning alerts found: ${duplicateAlertNumbers.join(', ')}`);

      const isEnterpriseCustomPattern = (alert) => alert.secret_type.startsWith('ent_');
      const isOrganizationCustomPattern = (alert) => alert.secret_type.startsWith('org_');
      const isBuiltInPattern = (alert) => !isEnterpriseCustomPattern(alert) && !isOrganizationCustomPattern(alert);

      const closeAlert = async (alertNumber, duplicateAlertNumber) => {
        await context.octokit.secretScanning.updateAlert({
          owner: repo.owner,
          repo: repo.repo,
          alert_number: alertNumber,
          state: "resolved",
          resolution: "false_positive",
          resolution_comment: `This alert is being closed as a duplicate of alert #${duplicateAlertNumber}.`,
        });
      };

      for (const duplicateAlert of duplicateAlerts) {
        if (isBuiltInPattern(duplicateAlert) && !isBuiltInPattern(newAlert)) {
          // Always prefer a built-in pattern
          // Close the new alert from the enterprise or organization custom pattern
          await closeAlert(newAlert.number, duplicateAlert.number);
          app.log.info("Closed the new alert from the enterprise or organization custom pattern.");
          // End the for loop because we only want to attempt to close the new alert once
          break;
        } else if (!isBuiltInPattern(duplicateAlert) && isBuiltInPattern(newAlert)) {
          // Always prefer a built-in pattern
          // Close the existing alert from the enterprise or organization custom pattern
          await closeAlert(duplicateAlert.number, newAlert.number);
          app.log.info("Closed the existing alert from the enterprise or organization custom pattern.");
        } else if (isEnterpriseCustomPattern(duplicateAlert) && isOrganizationCustomPattern(newAlert)) {
          // We do not need to check the state of the duplicate alert because we always prefer an alert 
          // with an enterprise custom pattern over an alert with an organization custom pattern
          // Close the new alert from the organization custom pattern
          await closeAlert(newAlert.number, duplicateAlert.number);
          app.log.info("Closed the new alert from the organization custom pattern.");
          // End the for loop because we only want to attempt to close the new alert once
          break;
        } else if (isOrganizationCustomPattern(duplicateAlert) && isEnterpriseCustomPattern(newAlert)) {
          // Check to see if the duplicate alert is already resolved
          if (duplicateAlert.state === "resolved") {
            app.log.info("The duplicate alert is already resolved.");
            // Close the new alert from the enterprise custom pattern
            await closeAlert(newAlert.number, duplicateAlert.number);
            app.log.info("Closed the new alert from the enterprise custom pattern.");
            // End the for loop because we only want to attempt to close the new alert once
            break;
          }
        } else if (isOrganizationCustomPattern(duplicateAlert) && isOrganizationCustomPattern(newAlert)) {
          // Close the new alert from the organization custom pattern
          await closeAlert(newAlert.number, duplicateAlert.number);
          app.log.info("Closed the new alert from the organization custom pattern.");
          // End the for loop because we only want to attempt to close the new alert once
          break;
        } else if (isEnterpriseCustomPattern(duplicateAlert) && isEnterpriseCustomPattern(newAlert)) {
          // Close the new alert from the enterprise custom pattern
          await closeAlert(newAlert.number, duplicateAlert.number);
          app.log.info("Closed the new alert from the enterprise custom pattern.");
          // End the for loop because we only want to attempt to close the new alert once
          break;
        }
      }
    } else {
      app.log.info("New unique secret scanning alert found!");
    }
  });
};