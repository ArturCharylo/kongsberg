import json
import sys
from pathlib import Path


report_path = Path(sys.argv[1])
metrics_path = Path(sys.argv[2])
results = json.loads(report_path.read_text(encoding='utf-8'))

errors = sum(result.get('errorCount', 0) for result in results)
warnings = sum(result.get('warningCount', 0) for result in results)
files = len(results)
files_with_errors = sum(result.get('errorCount', 0) > 0 for result in results)
files_with_warnings = sum(result.get('warningCount', 0) > 0 for result in results)

metrics = [
    f'web_static_analysis_errors_total {errors}',
    f'web_static_analysis_warnings_total {warnings}',
    f'web_static_analysis_files_total {files}',
    f'web_static_analysis_files_with_errors_total {files_with_errors}',
    f'web_static_analysis_files_with_warnings_total {files_with_warnings}',
]
metrics_path.write_text('\n'.join(metrics) + '\n', encoding='utf-8')
