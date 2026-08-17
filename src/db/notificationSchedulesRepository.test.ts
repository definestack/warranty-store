import { getDatabase, initDatabase } from './database';
import {
  deleteSchedulesForItem,
  getSchedulesForItem,
  saveSchedulesForItem,
} from './notificationSchedulesRepository';
import { createItem } from './warrantyRepository';

beforeAll(async () => {
  await initDatabase();
});

beforeEach(async () => {
  await getDatabase().runAsync('DELETE FROM notification_schedules');
  await getDatabase().runAsync('DELETE FROM warranty_items');
});

async function makeItem(name = 'Blender') {
  return createItem({ name, purchaseDate: '2026-01-15', warrantyMonths: 12 });
}

describe('saveSchedulesForItem', () => {
  it('persists each schedule for the item', async () => {
    const item = await makeItem();

    await saveSchedulesForItem(item.id, [
      { reminderKind: 'thirtyDay', notificationId: 'notif-30', triggerAt: '2026-12-16T09:00:00.000Z' },
      { reminderKind: 'sevenDay', notificationId: 'notif-7', triggerAt: '2027-01-08T09:00:00.000Z' },
    ]);

    const schedules = await getSchedulesForItem(item.id);
    expect(schedules).toHaveLength(2);
    expect(schedules.map((s) => s.reminderKind)).toEqual(['thirtyDay', 'sevenDay']);
    expect(schedules.map((s) => s.notificationId)).toEqual(['notif-30', 'notif-7']);
  });

  it('does nothing for an empty schedule list', async () => {
    const item = await makeItem();

    await saveSchedulesForItem(item.id, []);

    expect(await getSchedulesForItem(item.id)).toEqual([]);
  });
});

describe('getSchedulesForItem', () => {
  it('returns an empty array when the item has no schedules', async () => {
    const item = await makeItem();
    expect(await getSchedulesForItem(item.id)).toEqual([]);
  });

  it('only returns schedules for the requested item', async () => {
    const itemA = await makeItem('A');
    const itemB = await makeItem('B');
    await saveSchedulesForItem(itemA.id, [
      { reminderKind: 'onExpiry', notificationId: 'notif-a', triggerAt: '2027-01-15T09:00:00.000Z' },
    ]);
    await saveSchedulesForItem(itemB.id, [
      { reminderKind: 'onExpiry', notificationId: 'notif-b', triggerAt: '2027-01-15T09:00:00.000Z' },
    ]);

    const schedules = await getSchedulesForItem(itemA.id);
    expect(schedules).toHaveLength(1);
    expect(schedules[0].notificationId).toBe('notif-a');
  });
});

describe('deleteSchedulesForItem', () => {
  it('removes all schedules for the item', async () => {
    const item = await makeItem();
    await saveSchedulesForItem(item.id, [
      { reminderKind: 'thirtyDay', notificationId: 'notif-30', triggerAt: '2026-12-16T09:00:00.000Z' },
      { reminderKind: 'sevenDay', notificationId: 'notif-7', triggerAt: '2027-01-08T09:00:00.000Z' },
    ]);

    await deleteSchedulesForItem(item.id);

    expect(await getSchedulesForItem(item.id)).toEqual([]);
  });

  it('does not affect schedules belonging to other items', async () => {
    const itemA = await makeItem('A');
    const itemB = await makeItem('B');
    await saveSchedulesForItem(itemA.id, [
      { reminderKind: 'onExpiry', notificationId: 'notif-a', triggerAt: '2027-01-15T09:00:00.000Z' },
    ]);
    await saveSchedulesForItem(itemB.id, [
      { reminderKind: 'onExpiry', notificationId: 'notif-b', triggerAt: '2027-01-15T09:00:00.000Z' },
    ]);

    await deleteSchedulesForItem(itemA.id);

    expect(await getSchedulesForItem(itemA.id)).toEqual([]);
    expect(await getSchedulesForItem(itemB.id)).toHaveLength(1);
  });

  it('does nothing when the item has no schedules', async () => {
    const item = await makeItem();

    await expect(deleteSchedulesForItem(item.id)).resolves.toBeUndefined();
  });
});
