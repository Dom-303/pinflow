import { Command } from 'commander';

import { formatDoctorReport, runDoctor } from '../doctor/doctor.js';

export const DoctorCommand = new Command('doctor')
  .description('Diagnose PinFlow setup and relay health')
  .option('--json', 'Print machine-readable JSON')
  .action(async (options: { json?: boolean }) => {
    try {
      const report = await runDoctor();

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(formatDoctorReport(report));
      }

      process.exit(report.ok ? 0 : 1);
    } catch (error) {
      console.error(`[pinflow-cli] Doctor failed: ${error}`);
      process.exit(1);
    }
  });
