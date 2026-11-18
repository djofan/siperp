import unittest
from prepare_legacy import statements, values, prepare, TABLES


class DumpTests(unittest.TestCase):
    def test_literals_keep_exact_money_and_quoted_delimiters(self):
        self.assertEqual(values("(1,'a; b, (c)\\nO\\'Neil','it''s',NULL,9000000000000000)"),
                         [['1', "a; b, (c)\nO'Neil", "it's", None, '9000000000000000']])

    def test_comments_and_sql_inside_values_are_data(self):
        sql = "-- comment\nINSERT INTO `x` (`id`) VALUES ('DROP TABLE users; -- not a comment'); /* ignored */ COMMIT;"
        result = list(statements(sql))
        self.assertEqual(len(result), 2)
        self.assertIn('DROP TABLE users;', result[0])

    def test_expression_and_truncation_rejected(self):
        for source in ["(NOW())", "('unfinished)", "(1,2", "(1+2)"]:
            with self.assertRaises(ValueError):
                values(source)
        with self.assertRaises(ValueError):
            list(statements("INSERT INTO `x` VALUES ('no semicolon')"))

    def test_credentials_and_technical_tables_never_exported(self):
        sql = ''.join('CREATE TABLE `' + name + '` (`id` bigint);' for name in TABLES)
        sql += "INSERT INTO `users` (`id`,`name`,`username`,`email`,`password`,`remember_token`) VALUES (1,'Test','test','test@example.test','SECRET_HASH','SECRET_TOKEN');"
        sql += "INSERT INTO `password_resets` (`token`) VALUES ('PRIVATE_TOKEN');"
        result = prepare(sql.encode(), 'source', 'UTC')
        self.assertEqual(set(result['tables']['users'][0]), set(TABLES['users']))
        self.assertNotIn('SECRET', str(result))
        self.assertNotIn('PRIVATE_TOKEN', str(result))


if __name__ == '__main__':
    unittest.main()
