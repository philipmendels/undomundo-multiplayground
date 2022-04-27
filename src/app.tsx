import { FC, StrictMode, useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { v4 } from "uuid";

import { PBT, ServerBatch, Batch } from "./models";
import { Playground } from "./components/playground";
import { Client, useClient } from "./use-client";
import { last } from "./util";
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";

const Root = styled.div`
  height: 100vh;
  width: 100vw;
  background: #252526;
  padding: 20px;
`;
const Row = styled.div`
  display: flex;
`;

type SyncModus = "rewindActions" | "ignoreConflictingUpdates";

const handleEffect = (
  client: Client,
  otherClient: Client,
  serverLog: React.MutableRefObject<Batch<PBT>[]>,
  syncModus: SyncModus
) => {
  // console.log("handle effect", syncModus);
  const updates = client.isSyncDragEnabled
    ? client.uState.stateUpdates.filter((update) => !update.skipState)
    : client.uState.stateUpdates.filter((update) => !update.skipHistory);

  if (updates.length) {
    const batch: Batch<PBT> = {
      updates,
      id: v4(),
    };

    if (syncModus === "ignoreConflictingUpdates") {
      client.unconfirmedUpdates.current.push(batch);
    } else {
      client.log.current.push(batch);
    }

    const syncUp = () => {
      const parentId = last(serverLog.current)?.id;
      serverLog.current = [batch];

      const serverBatch: ServerBatch<PBT> = {
        batch,
        parentId,
      };

      const syncDown = () => {
        if (syncModus === "ignoreConflictingUpdates") {
          otherClient.pushAbsUpdate(batch);
        } else {
          otherClient.handleUpdate(serverBatch);
        }
      };

      if (otherClient.isDelayed) {
        setTimeout(syncDown, otherClient.syncDownTime * 1000);
      } else {
        syncDown();
      }

      if (syncModus === "ignoreConflictingUpdates") {
        const confirm = () => {
          client.confirmAbsUpdate(batch.id);
        };

        if (client.isDelayed) {
          setTimeout(confirm, client.syncUpTime * 1000);
        } else {
          confirm();
        }
      }
    };

    if (client.isDelayed) {
      setTimeout(syncUp, client.syncUpTime * 1000);
    } else {
      syncUp();
    }
  }
};

export const App: FC = () => {
  const client1 = useClient("A");

  const client2 = useClient("B");

  const [syncModus, setSyncModus] = useState<SyncModus>("rewindActions");

  const serverLog = useRef<Batch<PBT>[]>([]);

  useEffect(() => {
    handleEffect(client1, client2, serverLog, syncModus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client1.uState.stateUpdates]);

  useEffect(() => {
    handleEffect(client2, client1, serverLog, syncModus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client2.uState.stateUpdates]);

  return (
    <StrictMode>
      <Root>
        <div style={{ padding: "20px" }}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Sync algorithm</FormLabel>
            <RadioGroup
              row
              aria-label="positioning"
              value={syncModus}
              onChange={(_, value) => setSyncModus(value as SyncModus)}
            >
              <FormControlLabel
                value={"rewindActions" as SyncModus}
                control={<Radio color="primary" />}
                label="Reorder updates"
              />
              <FormControlLabel
                color="primary"
                value={"ignoreConflictingUpdates" as SyncModus}
                control={<Radio color="primary" />}
                label="Ignore conflicting updates"
              />
            </RadioGroup>
          </FormControl>
        </div>

        <Row>
          <Playground client={client1} />
          <Playground client={client2} />
        </Row>
      </Root>
    </StrictMode>
  );
};
