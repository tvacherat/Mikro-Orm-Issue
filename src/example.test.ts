import {
  Collection,
  Entity,
  ManyToOne,
  MikroORM,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/sqlite';

@Entity()
class User {
  @PrimaryKey()
  id!: number;

  @OneToMany(() => Book, b => b.user)
  books = new Collection<Book>(this);

  @Property()
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

@Entity()
class Book {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => User, {
    name: 'user',
    nullable: true,
    deleteRule: 'set null',
  })
  user?: User;

  @Property()
  title: string;

  constructor(title: string, user?: User) {
    this.title = title;
    this.user = user;
  }
}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ':memory:',
    entities: [User],
    debug: ['query', 'query-params'],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test('$every must return the user if book title = "title"', async () => {
  orm.em.create(User, { name: 'Foo' });
  await orm.em.flush();
  orm.em.clear();

  orm.em.create(Book, { title: 'title', user: orm.em.getReference(User, 1) });
  await orm.em.flush();
  orm.em.clear();

  const user = await orm.em.findOneOrFail(User, {
    books: { $every: { title: 'title' } },
  });
  expect(user.name).toBe('Foo');
});

test('$every must return null if no book exist with title = "bad title"', async () => {
  await orm.em.nativeDelete(Book, { title: 'book' });
  const user = await orm.em.findOne(User, { books: { $every: { title: 'bad title' } } });
  expect(user).toBe(null);
});

test('$every must return null if no book exists at all', async () => {
  await orm.em.nativeDelete(Book, { title: 'title' });
  const user = await orm.em.findOne(User, { books: { $every: { title: 'title' } } });
  expect(user).toBe(null);
});
