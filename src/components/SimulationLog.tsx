import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, AlertCircle, Info, Loader, XCircle } from 'lucide-react';

export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'loading';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
}

const LogIcon = ({ level }: { level: LogLevel }) => {
  switch (level) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'warning':
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    case 'error':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'loading':
      return <Loader className="h-5 w-5 animate-spin text-blue-500" />;
    case 'info':
    default:
      return <Info className="h-5 w-5 text-gray-400" />;
  }
};

interface SimulationLogProps {
  logs: LogEntry[];
}

export const SimulationLog = ({ logs }: SimulationLogProps) => {
  return (
    <Card className="mt-6 bg-gray-900 border-gray-700 text-white">
      <CardHeader>
        <CardTitle className="text-lg text-gray-200">Logs de Simulación en Tiempo Real</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 overflow-y-auto rounded-md bg-black p-4 font-mono text-sm">
          {logs.map((log, index) => (
            <div key={index} className="flex items-start gap-3 mb-2">
              <span className="mt-0.5">
                <LogIcon level={log.level} />
              </span>
              <span className="flex-1 whitespace-pre-wrap">{log.message}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
